# Razer demo script: known defect → human review → AI completes

One continuous flow for an APAC (Australia) customer. It combines the original
Scenario 3 (spotting a known defect, so troubleshooting is skipped) with Scenario 1
(a human reviews the evidence, then the AI takes back over).

**Narrative:** "Look how smart the agent is" → "look how it works with a human" →
"look how it finishes the job without making the customer repeat anything."

**Target time:** 6–7 minutes.

---

## Before the demo

### Have ready
- **Photo 1:** the cut cable with the mouse visible.
- **Photo 2:** a close-up of the serial label (`RZ01-0430-1234`).
- Save them on the desktop so they're quick to drag in.

### Screen layout
- **Left:** the Decagon test chat on **Staging**.
- **Right:** the agent console at <https://razer-demo-site.netlify.app/agent>.

### Pre-flight checklist
- [ ] The console pill says **"Connected to Decagon AU"**.
- [ ] Clicked **Clear all** in the console, so the sidebar is empty.
- [ ] The test chat is a fresh conversation on Staging.
- [ ] File upload works in the chat before handoff (test with any image).
- [ ] The photos are on the desktop.

---

## The script

Lines in `code` are typed exactly as shown. "AI" lines are what the agent should do, in its own words.

### Act 1: smart diagnosis (~1.5 min)

| # | Where | Do / type | What should happen | Talking point |
|---|---|---|---|---|
| 1 | Chat | `Hi, my Razer Viper V3 Pro right-click isn't working` | AI identifies the **Razer Viper V3 Pro** and checks known issues. | "One message. The agent identifies the exact product and checks it against Razer's known-defect list." |
| 2 | Chat | *(AI)* | AI says this is a **recognised right-click switch defect (batch 2024Q3)**, so no troubleshooting is needed, and asks for the serial and purchase date. | **The key moment.** "Haikal mentioned certain models have known problems, and Razer replaces those straight away without 10 troubleshooting steps. That just saved this customer about 15 minutes, and saved Razer an agent's time." |
| 3 | Chat | `Serial is RZ01-0430-1234, I bought it in March 2026` | AI records them and asks where the customer is located. | — |
| 4 | Chat | `I'm in Sydney, Australia` | Warranty is **valid**. The AI says "good news, you're covered for a free replacement" and gives the shipping estimate, without mentioning returns. It then explains that in Australia you **don't post the old mouse back**: you cut the cable and send two photos, a Razer specialist reviews them, and you're asked whether you're happy to go ahead. | "The agent applies the APAC policy automatically, and frames it as the easy option: no trip to the post office." |

### Act 2: cut-cord evidence and handoff (~1.5 min)

| # | Where | Do / type | What should happen | Talking point |
|---|---|---|---|---|
| 5 | Chat | `Yes, happy to do that` | AI sends short instructions: cut through the cable, then **Photo 1** of the cut cable with the mouse visible and **Photo 2** of the serial label. No video. | — |
| 6 | Chat | **Upload Photo 1 and Photo 2**, then type `Done, here's the cut cable and the serial label` | **One** handoff message: *"Thanks! I've shared your photos with a Razer specialist for review (ticket EVD-2026-…). They usually review within 5-10 minutes and will update you right here in this chat."* | "This is the one step that needs human judgement: is the cord really destroyed? Everything up to here was automated." |
| 7 | Console | *(watch the sidebar)* | **Within about 3 seconds** a new case appears, marked **With human**. Click it. | "Here's the specialist's view. Nobody had to read the transcript." |
| 8 | Console | *(point at the right-hand panel)* | Case details are filled in: product, model, serial, region, warranty, issue, evidence ticket, the **photos** and an **AI summary**. | "Full context in one place: what's wrong, warranty status, region and the evidence. The specialist can decide in seconds." |

### Act 3: the human step (~1.5 min)

| # | Where | Do / type | What should happen | Talking point |
|---|---|---|---|---|
| 9 | Chat | `Thanks! Roughly how long does the review take?` | The AI does **not** reply. The message appears in the **console** thread. | "The customer stays in the same chat window. Their messages now go to the human." |
| 10 | Console | Reply: `Hi! I'm reviewing your photos now, this will only take a minute.` → **Send** | The reply appears in the chat from **Razer Support Specialist**. | "The human writes in their own tool and the customer sees it in the same thread. No new chat, no new ticket." |
| 11 | Console | Reply: `All approved, handing you back now!` → **Send**. Then reviewer notes: `Cord fully severed, device and serial label visible. Approved.` → **Approve & hand back to AI** | The reply appears in the chat, and the console status changes to **Back with AI**. | "One click. The decision is written onto the conversation, and the AI takes over again." |

### Act 4: the AI finishes the job (~1.5 min)

| # | Where | Do / type | What should happen | Talking point |
|---|---|---|---|---|
| 12 | Chat | *(no typing; wait)* | **The AI speaks first.** It welcomes the customer back, confirms the evidence for the **Viper V3 Pro** was approved, and asks **only** for a shipping address. | "The customer didn't type anything, and the agent didn't ask for the product, serial or region again. It already has them." |
| 13 | Chat | `Sure, 12 George St, Sydney NSW 2000` | AI creates the replacement: **order RMA-…**, arriving in **7–10 business days**. | — |
| 14 | Chat | *(AI wraps up)* | AI summarises (diagnosis → evidence → human check → replacement), confirms there's nothing more to do, and asks if there's anything else. | "The AI handled about 90% of this. The human spent under a minute on the one judgement call. That's where the cost saving comes from: 70% of Razer's agent time goes on troubleshooting and replacements." |
| 15 | Chat | `That's all, thanks!` | AI signs off. | — |

---

## Checkpoints: if something doesn't happen

| Beat | You should see | If it doesn't happen, the likely cause |
|---|---|---|
| 2 | AI recognises the known defect and skips troubleshooting | The product or symptom wording doesn't match the mock. Use exactly "Viper V3 Pro" and "right-click". |
| 4 | Warranty is valid | No purchase date was given. Give a recent one. |
| 7 | The case appears in the console | Escalation tool `escalate_to_human_console`: the secret (`WEBHOOK_SHARED_SECRET`) doesn't match Netlify, or the call to `/api/new-escalation` failed. Check the Decagon tool logs. |
| 8 | Photos load in the console | The Decagon file URLs need a login to view. The console shows the link instead of the image, so the site would need to fetch them itself. |
| 9 | The customer's message appears in the console | The On User Message integration (`cdm_3KRouIX0INyA57ohEkfdC7mX8mf`), or the conversation wasn't escalated. |
| 10 | The reply appears in the chat | The webhook integration (`cdm_3KRoRqJEQ6wwJEsde4EjlBhRwfO`): the module ID or API key in Netlify, or the conversation lookup. The console shows an error message if Decagon rejects the call. |
| 12 | The AI speaks first after Approve | `trigger_ai_flow()` didn't run, or the AI stayed in Connect to Agent. Connect to Agent now checks `get_escalation_context` and switches to Post-Approval when `evidence_review_status` is approved. Sending a human message just before Approve (step 11) helps the switch. |
| 13 | **The AI answers the address**, and the console thread shows **"Relayed to AI"** | The conversation stays escalated, so the console relays each customer message (`resume_ai` → `trigger_ai_flow()`). If you see "AI relay failed: …", the webhook rejected it. If the AI says the specialist is "still reviewing", it didn't see the approval (see step 12). |
| 13 | The replacement is created without asking for the product or region again | `initiate_replacement` reads `region` from the transcript. If the AI asks again, just answer. |

## Recovery lines (if something stalls live)
- **Case slow to appear in the console:** "In production this would land in Razer's existing agent desk. We're using a lightweight console for the demo." Then refresh the console.
- **The AI doesn't speak after Approve:** type `Hi, any update?` in the chat. That prompts the AI to respond.
- **The AI asks for something it already has:** "It's double-checking before creating the order," then answer.
- **Anything else:** "This is running live against a staging environment," then move on to the next beat.

---

## Known quirks
Fixed after the first rehearsal (on `initial-build`, commits `d03a8d1` and `18e6de4`):
- The AI no longer asks the customer to "confirm the approved warranty replacement".
- Cut-cord is framed as the simpler option ("no need to post it back"), with no "return shipping isn't practical" line and no prepaid-label mention for AU/SG.
- Evidence is two photos only, with no video.
- A single handoff message includes the ticket, "usually within 5-10 minutes" and "updates right here in this chat". Evidence tickets use the current year.

Fixed in `initiate_replacement` (on `initial-build`, commit `5d0640f`):
- Cut-cord (AU/SG) confirmations no longer mention a return label (`return_label_sent: false`).
- Order IDs use the current year (`RMA-2026-…`).
- `model_id` is read from the `escalation_model_id` metadata first, falling back to `lookup_product_catalog`, so it survives the handback.
