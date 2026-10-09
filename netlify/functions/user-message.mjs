// Called by the Decagon On User Message integration while a conversation is escalated.
// Body: { conversation_id, text, attachments?: [url, ...] }
import {
  addMessage, getConversation, isFromDecagon, json, newConversation, readJson, saveConversation,
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

  await saveConversation(conv);
  return json({ ok: true });
};
