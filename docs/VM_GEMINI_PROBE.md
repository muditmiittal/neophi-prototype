# One-shot Gemini video probe from the relay VM

Ask Ramit which API and exact video-capable model he used. For standard Vertex AI, get the Google Cloud project ID and model location, and have him authorize the intended VM identity or provide access to an approved project key outside chat. For an Express or Gemini Developer API key, confirm the key type and the billing account independently.

The probe makes one billable request with a bundled Neophi demo clip and prints a redacted result. It runs inside the existing relay container without changing configuration or restarting the container. Vertex ADC mode needs an already configured `gcloud` ADC identity on the VM.

Paste this whole block into Termius on the Linux VM. Enter a key only at the hidden prompt and send back only the result line.

```bash
(
  set +x
  read -rp "API (vertex-adc, vertex-key, vertex-express, gemini-api): " mode
  case "$mode" in
    vertex-adc|vertex-key|vertex-express|gemini-api) ;;
    *) echo "Choose one of the four API types."; exit 1 ;;
  esac
  read -rp "Exact model ID: " model
  project=
  location=
  if [[ "$mode" == vertex-adc || "$mode" == vertex-key ]]; then
    read -rp "Google Cloud project ID: " project
    read -rp "Model location (e.g. global): " location
  fi
  if [[ "$mode" == vertex-adc ]]; then
    credential="$(gcloud auth application-default print-access-token 2>/dev/null)" || {
      echo "VM ADC unavailable. Check the intended VM identity."; exit 1;
    }
  else
    read -rsp "API key: " credential
    echo
  fi
  [[ -n "$credential" ]] || { echo "No credential provided."; exit 1; }

  printf '%s' "$credential" | docker exec -i vm-neophi-1 node --input-type=module -e '
    import { readFileSync } from "node:fs";
    const [mode, model, project, location] = process.argv.slice(1);
    const credential = readFileSync(0, "utf8").trim();
    const name = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;
    if (!name.test(model) || (project && !name.test(project)) || (location && !/^[a-z0-9-]+$/.test(location))) {
      console.log("Invalid model, project or location."); process.exitCode = 1;
    } else if ((mode === "vertex-adc" || mode === "vertex-key") && (!project || !location)) {
      console.log("Vertex project and model location are required."); process.exitCode = 1;
    } else {
      try {
        const clip = readFileSync("/app/dist/video/loop_creator.mp4");
        const vertexHost = location && location !== "global" ? location + "-aiplatform.googleapis.com" : "aiplatform.googleapis.com";
        const url = mode === "gemini-api"
          ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
          : mode === "vertex-express"
            ? `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent`
            : `https://${vertexHost}/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;
        const auth = mode === "vertex-adc" ? { authorization: "Bearer " + credential } : { "x-goog-api-key": credential };
        const response = await fetch(url, {
          method: "POST", headers: { ...auth, "content-type": "application/json" }, signal: AbortSignal.timeout(60000),
          body: JSON.stringify({ contents: [{ role: "user", parts: [
            { inlineData: { mimeType: "video/mp4", data: clip.toString("base64") } },
            { text: "Describe one visible detail from the attached clip in one short sentence." }
          ] }] })
        });
        const result = await response.json().catch(() => ({}));
        const replied = Boolean(result.candidates?.some(candidate => candidate.content?.parts?.some(part => part.text && !part.thought)));
        console.log(JSON.stringify({ http: response.status, status: result.error?.status ?? null, videoBytes: clip.length, replied }));
        if (!response.ok || !replied) process.exitCode = 1;
      } catch (error) {
        console.log(JSON.stringify({ failure: error.code === "ENOENT" ? "sample_clip_missing" : error.name }));
        process.exitCode = 1;
      }
    }
  ' -- "$mode" "$model" "$project" "$location"
)
```

An HTTP 200 with `replied: true` verifies the chosen API processed an attached sample clip from the relay runtime. It does not verify the deployed app's provider configuration or live Reel retrieval. For an HTTP 403, confirm the credential can invoke the selected model in that project and location. A 404 calls for checking the model ID, location, and API type.

[Google Cloud API keys](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/start/api-keys) · [Express generateContent](https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/express-mode/rest/v1/publishers.models/generateContent) · [Gemini Developer API video](https://ai.google.dev/gemini-api/docs/video-understanding)
