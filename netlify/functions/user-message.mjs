// Called by the Decagon On User Message integration while a conversation is escalated.
// Body: { conversation_id, text, attachments?: [url, ...] }
//
// Decagon can't de-escalate a custom-integration conversation, so after the human hands
// back to the AI, customer messages keep arriving here. For those, relay a `resume_ai`
// action to the webhook integration, which calls mgr.trigger_ai_flow() so the AI replies.
import {
  addMessage, getConversation, isFromDecagon, json, newConversation, readJson, saveConversation, sendToDecagon,
} from "../lib/shared.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!isFromDecagon(req)) return json({ error: "unauthorized" }, 401);

  const body = await readJson(req);
  const id = body?.conversation_id;
  if (!id) return json({ error: "conversation_id required" }, 400);

  // If the escalation announcement was missed, still capture the message.
  const conv = (await getConversation(id)) ?? newConversation(id);
  addMessage(conv, "customer", body.text, body.attachments ?? []);

  if (conv.status !== "with_ai") {
    await saveConversation(conv);
    return json({ ok: true });
  }

  // Back with the AI: ask Decagon to run the AI on this message.
  try {
    const result = await sendToDecagon({ action: "resume_ai", conversation_id: id });
    addMessage(conv, "system", result.sent ? "Relayed to AI" : "AI relay skipped (Decagon not configured)");
  } catch (err) {
    // Still 200 so the On User Message integration doesn't fail; the error shows in the console.
    addMessage(conv, "system", `AI relay failed: ${err.message}`);
  }
  await saveConversation(conv);
  return json({ ok: true, relayed: true });
};
