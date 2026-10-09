// Polled by the agent UI.
//   GET /api/conversations          -> summary list, newest first
//   GET /api/conversations?id=<id>  -> one full conversation
import { getConversation, json, store } from "../lib/shared.mjs";

export default async (req) => {
  if (req.method !== "GET") return json({ error: "GET only" }, 405);

  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const conv = await getConversation(id);
    return conv ? json(conv) : json({ error: "not found" }, 404);
  }

  const s = store();
  const { blobs } = await s.list();
  const all = await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" })));

  const summaries = all
    .filter(Boolean)
    .map((c) => {
      const last = [...c.messages].reverse().find((m) => m.role !== "system");
      return {
        id: c.id,
        status: c.status,
        product: c.context?.product ?? null,
        customer: c.context?.customer_name ?? c.context?.customer_user_id ?? null,
        lastMessage: last?.text ?? null,
        messageCount: c.messages.length,
        updatedAt: c.updatedAt,
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return json(summaries);
};
