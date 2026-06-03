import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// Genereert een magic-link en POST't 'm naar GHL inbound webhook,
// zodat GHL de Unlock-branded welkomstmail kan versturen.
// Altijd 200 om email enumeration te voorkomen.

const PORTAL_ORIGIN = process.env.PORTAL_ORIGIN ?? "https://app.unlockmotion.nl";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    return await handle(req, res);
  } catch (err) {
    console.error("request-login-link unhandled:", err);
    return res.status(500).json({ error: "Onverwachte fout." });
  }
}

async function handle(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ghlWebhookUrl = process.env.GHL_LOGIN_WEBHOOK_URL;
  if (!url || !serviceKey) return res.status(500).json({ error: "Supabase env-vars ontbreken." });
  if (!ghlWebhookUrl) return res.status(500).json({ error: "GHL_LOGIN_WEBHOOK_URL ontbreekt." });

  const body = (req.body ?? {}) as { email?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !/.+@.+\..+/.test(email)) {
    return res.status(400).json({ error: "Ongeldig e-mailadres." });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const redirectTo = `${PORTAL_ORIGIN}/app`;
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });

  if (linkErr) {
    console.warn("generateLink failed (user mogelijk onbekend):", email, linkErr.message);
    return res.status(200).json({ ok: true });
  }
  const magicLink = linkData?.properties?.action_link ?? "";
  if (!magicLink) return res.status(200).json({ ok: true });

  const ghlRes = await fetch(ghlWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, magicLink, portalUrl: redirectTo }),
  });
  if (!ghlRes.ok) {
    const text = await ghlRes.text().catch(() => "");
    console.error("GHL login webhook faalde:", ghlRes.status, text);
    return res.status(502).json({ error: "Kon login-mail niet versturen." });
  }
  return res.status(200).json({ ok: true });
}
