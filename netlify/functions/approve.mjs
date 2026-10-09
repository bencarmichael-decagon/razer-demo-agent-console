// Agent UI -> Decagon: approve the destruction evidence and hand back to the AI.
// The On Webhook Event integration sets evidence_review_status = approved and calls
// mgr.trigger_ai_flow(), which routes to the Post-Approval Replacement AOP.
// Body: { conversation_id, reviewer_notes? }
import { addMessage, getConversation, json, readJson, saveConversation, sendToDecagon } from "../lib/shared.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const body = await readJson(req);
  if (!body?.conversation_id) return json({ error: "conversation_id required" }, 400);

  const conv = await getConversation(body.conversation_id);
  if (!conv) return json({ error: "not found" }, 404);
  if (conv.status !== "with_human") return json({ error: `conversation is ${conv.status}` }, 409);

  const notes = body.reviewer_notes?.trim() || "Evidence approved.";
  let result;
  try {
    result = await sendToDecagon({
      action: "approve_evidence",
      conversation_id: conv.id,
      decision: "approved",
      reviewer_notes: notes,
    });
  } catch (err) {
    return json({ error: err.message }, 502);
  }

  conv.status = "with_ai";
  addMessage(conv, "system", `Evidence approved — handed back to AI. Notes: ${notes}`);
  await saveConversation(conv);
  return json({ ok: true, ...result });
};
