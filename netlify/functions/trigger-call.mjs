// Agent UI -> Decagon Outbound: enrol the customer in the outbound campaign so the AI
// calls them to confirm the approved replacement. Demo-only: works on any conversation.
// The contact is hard-coded, standing in for the customer record a CRM would already hold.
// Body: { conversation_id }
import { addMessage, getConversation, json, readJson, saveConversation } from "../lib/shared.mjs";

const CUSTOMER_CONTACT = {
  first_name: "Ben",
  phone: "+14153479671",
};

// Used when a conversation has no case details, so the call always makes sense.
const DEMO_CASE = {
  product: "Razer Viper V3 Pro",
  model_id: "MOUSE-RVV3P",
  serial_number: "RZ01-0430-1234",
  region: "AU",
  warranty_status: "valid",
  issue_summary: "Right-click switch failure (known defect, batch 2024Q3)",
};

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const missionId = process.env.OUTBOUND_MISSION_ID;
  if (!missionId) return json({ error: "OUTBOUND_MISSION_ID not set" }, 500);

  const body = await readJson(req);
  if (!body?.conversation_id) return json({ error: "conversation_id required" }, 400);

  const conv = await getConversation(body.conversation_id);
  if (!conv) return json({ error: "not found" }, 404);

  const target = CUSTOMER_CONTACT.phone;
  const firstName = CUSTOMER_CONTACT.first_name;

  const ctx = conv.context || {};
  const pick = (key) => ctx[key] || DEMO_CASE[key];

  const user = {
    // Must be unique per campaign, so every demo call gets its own id.
    user_id: `${conv.id}-${Date.now()}`,
    target,
    target_type: "PHONE",
    metadata: {
      outbound_reason: "evidence_approved_follow_up",
      first_name: firstName,
      original_conversation_id: conv.id,
      escalation_product_name: pick("product"),
      escalation_model_id: pick("model_id"),
      escalation_serial_number: pick("serial_number"),
      escalation_region: pick("region"),
      escalation_warranty_status: pick("warranty_status"),
      escalation_issue_summary: pick("issue_summary"),
      escalation_evidence_ticket_id: ctx.evidence_ticket_id || "EVD-2026-00001",
      evidence_review_status: "approved",
      reviewer_notes: "Cord fully severed, device and serial label visible. Approved.",
    },
  };
  if (process.env.DECAGON_PHONE_NUMBER) user.decagon_phone_number = process.env.DECAGON_PHONE_NUMBER;

  const base = process.env.DECAGON_BASE_URL || "https://au.api.decagon.ai";
  const res = await fetch(`${base}/mission_user/external/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DECAGON_API_KEY ?? ""}`,
    },
    body: JSON.stringify({ mission_id: missionId, users: [user] }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return json({ error: `Decagon outbound returned ${res.status}: ${detail.slice(0, 300)}` }, 502);
  }

  addMessage(conv, "system", `Outbound call requested to ${target} (${firstName})`);
  await saveConversation(conv);
  return json({ ok: true, target });
};
