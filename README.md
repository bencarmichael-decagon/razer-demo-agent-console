# Razer × Decagon demo site

Human agent console for the Razer demo scenarios. It pairs with the Decagon chat
widget on Razer's site: the AI escalates to this console, a human replies or
approves, and the conversation goes back to the AI.

- `/agent` — human reviewer console (queue, thread, case details, approve, close). `/` redirects here.

## Run locally

```bash
npm install
npm run dev        # http://localhost:8888
```

## Environment variables

Put these in `.env` for local dev. In production, set them in Netlify under
Site configuration > Environment variables.

| Variable | Required | What it is |
|---|---|---|
| `DECAGON_BASE_URL` | yes | `https://au.api.decagon.ai` |
| `DECAGON_API_KEY` | to send to Decagon | Bearer key for `POST /webhook/{module_id}` |
| `DECAGON_WEBHOOK_MODULE_ID` | to send to Decagon | ID of the On Webhook Event custom integration. Leave blank for local-only mode |
| `WEBHOOK_SHARED_SECRET` | yes | Any long random string. Decagon sends it in the `X-Webhook-Secret` header; store the same value as a Decagon secret |

With `DECAGON_WEBHOOK_MODULE_ID` blank, replies, approvals and closes are recorded
in the console but not sent to Decagon. The header pill shows which mode you're in.

## API

Called by Decagon (need `X-Webhook-Secret`):

| Endpoint | Called by | Body |
|---|---|---|
| `POST /api/new-escalation` | Escalation tool | `{ conversation_id, customer_name?, customer_user_id?, product?, model_id?, serial_number?, region?, warranty_status?, issue_summary?, evidence_ticket_id?, evidence_photo_urls?: [], transcript_summary? }` |
| `POST /api/user-message` | On User Message integration | `{ conversation_id, text, attachments?: [] }` |

Called by the console (server-side functions forward to Decagon with the Bearer key):

| Endpoint | Sends to the On Webhook Event integration |
|---|---|
| `POST /api/reply` `{ conversation_id, text }` | `{ action: "agent_reply", conversation_id, text }` |
| `POST /api/approve` `{ conversation_id, reviewer_notes? }` | `{ action: "approve_evidence", conversation_id, decision: "approved", reviewer_notes }` |
| `POST /api/close` `{ conversation_id, closing_message?, resolution_summary? }` | `{ action: "close_conversation", conversation_id, closing_message, resolution_summary }` |

Relay: when a customer message reaches `/api/user-message` for a conversation that's
back with the AI (after Approve), the site sends `{ action: "resume_ai", conversation_id }`
so the webhook integration calls `mgr.trigger_ai_flow()`. Decagon can't de-escalate a
custom-integration conversation, so this keeps the AI answering.

Console-only: `GET /api/conversations`, `GET /api/conversations?id=…`, `POST /api/reset`, `GET /api/status`.

## Simulate Decagon without Decagon

```bash
SECRET=change-me   # same as WEBHOOK_SHARED_SECRET

curl -X POST http://localhost:8888/api/new-escalation \
  -H "Content-Type: application/json" -H "X-Webhook-Secret: $SECRET" \
  -d '{"conversation_id":"demo-001","customer_name":"Alex Tan","product":"Razer DeathAdder V3","serial_number":"SN123456","region":"APAC","warranty_status":"active","issue_summary":"Right-click not registering","evidence_ticket_id":"EVD-2026-0042","evidence_photo_urls":["https://picsum.photos/seed/cord/400"]}'

curl -X POST http://localhost:8888/api/user-message \
  -H "Content-Type: application/json" -H "X-Webhook-Secret: $SECRET" \
  -d '{"conversation_id":"demo-001","text":"Hi, just uploaded the photos of the cut cord."}'
```

## Notes

- `/api/reset` has no auth, so anyone with the URL can clear the console. Fine for a demo.
- Storage is Netlify Blobs; `netlify dev` uses a local sandbox store.
