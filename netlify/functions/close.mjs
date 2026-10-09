// Agent UI -> Decagon: resolve and close the conversation (Scenario 2).
// Body: { conversation_id, closing_message?, resolution_summary? }
import { addMessage, getConversation, json, readJson, saveConversation, sendToDecagon } from "../lib/shared.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const body = await readJson(req);
  if (!body?.conversation_id) return json({ error: "conversation_id required" }, 400);

  const conv = await getConversation(body.conversation_id);
  if (!conv) return json({ error: "not found" }, 404);
  if (conv.status === "closed") return json({ error: "already closed" }, 409);

  const closingMessage = body.closing_message?.trim() || null; // null -> integration uses its default
  const summary = body.resolution_summary?.trim() || "Closed by agent";

  let result;
  try {
    result = await sendToDecagon({
      action: "close_conversation",
      conversation_id: conv.id,
      closing_message: closingMessage,
      resolution_summary: summary,
    });
  } catch (err) {
    return json({ error: err.message }, 502);
  }

  if (closingMessage) addMessage(conv, "agent", closingMessage);
  conv.status = "closed";
  conv.context = { ...conv.context, resolution_summary: summary };
  addMessage(conv, "system", `Conversation closed. ${summary}`);
  await saveConversation(conv);
  return json({ ok: true, ...result });
};
