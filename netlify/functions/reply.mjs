// Agent UI -> Decagon: send a human agent message to the customer.
// Body: { conversation_id, text }
import { addMessage, getConversation, json, readJson, saveConversation, sendToDecagon } from "../lib/shared.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const body = await readJson(req);
  const text = body?.text?.trim();
  if (!body?.conversation_id || !text) return json({ error: "conversation_id and text required" }, 400);

  const conv = await getConversation(body.conversation_id);
  if (!conv) return json({ error: "not found" }, 404);
  if (conv.status !== "with_human") return json({ error: `conversation is ${conv.status}` }, 409);

  let result;
  try {
    result = await sendToDecagon({ action: "agent_reply", conversation_id: conv.id, text });
  } catch (err) {
    return json({ error: err.message }, 502);
  }

  addMessage(conv, "agent", text);
  await saveConversation(conv);
  return json({ ok: true, ...result });
};
