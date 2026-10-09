// Called by the Decagon escalation tool when the AI hands off to a human.
// Body: { conversation_id, ...context } (product, serial_number, evidence_photo_urls, etc.)
import {
  addMessage, getConversation, isFromDecagon, json, newConversation, readJson, saveConversation,
} from "../lib/shared.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!isFromDecagon(req)) return json({ error: "unauthorized" }, 401);

  const body = await readJson(req);
  const id = body?.conversation_id;
  if (!id) return json({ error: "conversation_id required" }, 400);

  const { conversation_id, ...context } = body;
  const existing = await getConversation(id);

  // A conversation can escalate more than once (e.g. after a handback); keep its history.
  const conv = existing ?? newConversation(id, context);
  conv.context = { ...conv.context, ...context };
  conv.status = "with_human";
  addMessage(conv, "system", "Escalated to human reviewer");

  await saveConversation(conv);
  return json({ ok: true });
};
