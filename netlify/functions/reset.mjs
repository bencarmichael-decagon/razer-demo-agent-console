// Agent UI: wipe all stored conversations before a fresh demo run.
import { json, store } from "../lib/shared.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const s = store();
  const { blobs } = await s.list();
  await Promise.all(blobs.map((b) => s.delete(b.key)));
  return json({ ok: true, deleted: blobs.length });
};
