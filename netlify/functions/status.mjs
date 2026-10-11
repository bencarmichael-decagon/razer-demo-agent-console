// Agent UI: report whether actions reach Decagon or are local-only.
import { json } from "../lib/shared.mjs";

export default async () =>
  json({
    decagonConnected: Boolean(process.env.DECAGON_WEBHOOK_MODULE_ID && process.env.DECAGON_API_KEY),
    baseUrl: process.env.DECAGON_BASE_URL || "https://au.api.decagon.ai",
    inboundSecretSet: Boolean(process.env.WEBHOOK_SHARED_SECRET),
    outboundConfigured: Boolean(process.env.OUTBOUND_MISSION_ID && process.env.DECAGON_API_KEY),
  });
