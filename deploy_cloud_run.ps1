# Deploy Neophi to Cloud Run. Run from D:\Neophi\app in PowerShell AFTER the five APIs are enabled (see HACKATHON_RUNBOOK_20NOV.md, step C1).
#   .\deploy_cloud_run.ps1 -Project neojaipur-rag-1
# Secrets are NOT in this file. Create them once (step C3) and this script mounts them.
param([string]$Project = "neojaipur-rag-1", [string]$Region = "asia-south1", [string]$Service = "neophi")
$ErrorActionPreference = "Stop"
npm run build
gcloud run deploy $Service --project $Project --region $Region --source . --allow-unauthenticated `
  --min-instances 0 --max-instances 3 --memory 512Mi --cpu 1 --timeout 120 `
  --set-env-vars "GOOGLE_CLOUD_PROJECT=$Project,NEOPHI_PROVIDER=vertex" `
  --set-secrets "META_APP_SECRET=neophi-meta-app-secret:latest,META_VERIFY_TOKEN=neophi-meta-verify-token:latest"
gcloud run services describe $Service --project $Project --region $Region --format "value(status.url)"
Write-Host "Give the Cloud Run service account the role 'Vertex AI User' (roles/aiplatform.user) once, or Gemini calls will answer 403."
