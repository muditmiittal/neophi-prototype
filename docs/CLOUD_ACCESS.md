# Neophi access and runtime manifest

| Purpose | Destination | Owner action |
| --- | --- | --- |
| Prototype source | `muditmiittal/neophi-prototype`, `buildathon-prototype` | Grant the Cloud GitHub connection access to this private repository. Use the draft PR for review. |
| Partner source | `Ramitphi/neophii`, `main` | Public comparison source. Ask Ramit for the intended integration branch and any unpublished changes. |
| Dependency install | npm registry | Enable the environment's package-manager network preset or existing equivalent. Run `npm ci`. |
| Public relay check | `20-219-13-184.sslip.io`, HTTPS 443 | Add exactly this hostname if needed. Test `/api/health` from Cloud. A public health result does not grant relay or VM administration. |
| Private VM access | `epitomeworkstation.tail1ec3ca.ts.net`, Tailscale SSH | If Cloud VPN is available, the owner provides its Tailscale auth key in the environment UI and verifies the ACL permits only the intended host and operations. The existing Windows approval is local. |
| Meta webhook challenge | `META_VERIFY_TOKEN` on relay | Owner pairs with the selected app's callback verification field. |
| Meta webhook HMAC | `META_APP_SECRET` on relay | Owner or Claude Code provisions the selected app's App secret. Current app is NeoPhi parent 1481320687243886. |
| Relay requests | `NEOPHI_RELAY_TOKEN` on relay and one consumer | Owner provisions matching credentials through the approved secret store. `NEOPHI_RELAY_URL` is the public HTTPS origin for the consumer. |
| Optional Instagram replies | `INSTAGRAM_ACCESS_TOKEN` and `META_AUTO_REPLY` | Owner configures only when replies are wanted and permissions are verified. |
| Inference | Vertex ADC and `GOOGLE_CLOUD_PROJECT`, or `GEMINI_API_KEY` | Owner selects one supported provider path. Verify the intended identity and model on the actual always-on host. Keep secret values outside the repository and Cloud prompt. |

## VM operations

The observed Linux host is **EpitomeWorkStation**. Existing Tailscale SSH used login `oliver` and an owner approval. The relay and proxy containers were `vm-neophi-1` and `vm-caddy-1`. When Cloud access is approved and configured, first verify host identity and list the relevant running containers. Read the relay health locally inside the container and return only counters. Avoid dumping container environments, request bodies, Instagram notes, media URLs, or credentials.

For a VM write, ask the owner for approval with the exact target, file or service, proposed diff, verification and rollback. Use the existing operator workflow and check the relevant checkout before applying anything. Keep relay APIs and private admin access behind their existing authentication. Do not give a Cloud environment broad or permanent root access.

The laptop launcher starts the prototype consumer and app AI path. The public relay queues capture metadata and may cache valid video bytes. With the laptop offline, a separately approved always-on consumer and AI configuration are required for continuous analysis.
