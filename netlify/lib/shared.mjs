// Shared helpers for the Netlify Functions: storage, auth and the Decagon call.
import { getStore } from "@netlify/blobs";

const STORE_NAME = "conversations";

export function store() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export function now() {
  return new Date().toISOString();
}

// Inbound calls from Decagon (escalation tool, On User Message integration)
// must carry the shared secret.
export function isFromDecagon(req) {
  const expected = process.env.WEBHOOK_SHARED_SECRET;
  if (!expected) return false;
  return req.headers.get("x-webhook-secret") === expected;
}

export async function getConversation(id) {
  return store().get(id, { type: "json" });
}

export async function saveConversation(conv) {
  conv.updatedAt = now();
  await store().setJSON(conv.id, conv);
  return conv;
}

export function newConversation(id, context = {}) {
  const ts = now();
  return {
    id,
    status: "with_human", // with_human | with_ai | closed
    createdAt: ts,
    updatedAt: ts,
    context,
    messages: [],
  };
}

export function addMessage(conv, role, text, attachments = []) {
  conv.messages.push({ role, text: text ?? "", attachments, at: now() });
}

// POST an action to the On Webhook Event custom integration.
// Returns { sent: false } when no module ID is configured (local-only mode).
export async function sendToDecagon(payload) {
  const moduleId = process.env.DECAGON_WEBHOOK_MODULE_ID;
  if (!moduleId) return { sent: false, reason: "DECAGON_WEBHOOK_MODULE_ID not set" };

  const base = process.env.DECAGON_BASE_URL || "https://au.api.decagon.ai";
  const res = await fetch(`${base}/webhook/${moduleId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DECAGON_API_KEY ?? ""}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Decagon webhook returned ${res.status}: ${detail.slice(0, 300)}`);
  }
  return { sent: true };
}
