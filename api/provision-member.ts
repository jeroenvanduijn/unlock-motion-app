import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// Webhook aangeroepen door GymOps-cron zodra een SportBit-abonnement
// "Unlock Motion" actief wordt voor een lid.
//
// Idempotent: maakt user aan als die niet bestaat, anders update profiel.
// Genereert magic-link en POST't 'm naar GHL voor branded welkomstmail.
//
// Headers:
//   X-Unlock-Secret: <UNLOCK_WEBHOOK_SECRET>
// Body:
//   { email, fullName?, phone?, sportbitMemberId? }

const PORTAL_ORIGIN = process.env.PORTAL_ORIGIN ?? "https://app.unlockmotion.nl";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    return await handle(req, res);
  } catch (err) {
    console.error("provision-member unhandled:", err);
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message, step: "unhandled" });
  }
}

async function handle(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const secret = process.env.UNLOCK_WEBHOOK_SECRET;
  if (!secret) return res.status(500).json({ error: "UNLOCK_WEBHOOK_SECRET ontbreekt." });
  if (req.headers["x-unlock-secret"] !== secret) return res.status(401).json({ error: "Ongeldig secret." });

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return res.status(500).json({ error: "Supabase env-vars ontbreken." });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const body = (req.body ?? {}) as {
    email?: string;
    fullName?: string;
    phone?: string;
    sportbitMemberId?: string;
  };
  const email = (body.email ?? "").trim().toLowerCase();
  const fullName = (body.fullName ?? "").trim();
  const phone = (body.phone ?? "").trim();
  const sportbitMemberId = (body.sportbitMemberId ?? "").trim() || null;

  if (!email || !/.+@.+\..+/.test(email)) {
    return res.status(400).json({ error: "Ongeldig e-mailadres.", step: "validate" });
  }

  // 1. User aanmaken of bestaande ID ophalen
  let userId: string | null = null;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : {},
  });

  if (created?.user) {
    userId = created.user.id;
  } else if (createErr) {
    const alreadyExists =
      createErr.code === "email_exists" ||
      createErr.status === 422 ||
      /already/i.test(createErr.message);
    if (!alreadyExists) {
      console.error("createUser error:", createErr);
      return res.status(400).json({ error: createErr.message, step: "createUser" });
    }
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listErr) return res.status(500).json({ error: listErr.message, step: "listUsers" });
    const existing = list.users.find((u) => u.email?.toLowerCase() === email);
    if (!existing) return res.status(500).json({ error: "User bestaat al maar niet gevonden.", step: "listUsers" });
    userId = existing.id;
  }
  if (!userId) return res.status(500).json({ error: "Geen user ID.", step: "createUser" });

  // 2. Profile aanvullen
  const updates: Record<string, unknown> = { role: "member" };
  if (fullName) updates.full_name = fullName;
  if (phone) updates.phone = phone;
  if (sportbitMemberId) updates.sportbit_member_id = sportbitMemberId;
  const { error: updErr } = await admin.from("profiles").update(updates).eq("id", userId);
  if (updErr) {
    console.error("profile update error:", updErr);
    return res.status(500).json({ error: updErr.message, step: "profileUpdate" });
  }

  // 3. Magic-link genereren
  const redirectTo = `${PORTAL_ORIGIN}/app`;
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });
  if (linkErr) {
    console.error("generateLink error:", linkErr);
    return res.status(500).json({ error: linkErr.message, step: "generateLink" });
  }
  const magicLink = linkData?.properties?.action_link ?? "";

  // 4. Naar GHL Unlock-welkomstmail webhook sturen
  const welcomeWebhook = process.env.GHL_UNLOCK_WELCOME_WEBHOOK_URL;
  if (welcomeWebhook && magicLink) {
    const ghlRes = await fetch(welcomeWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, fullName, phone, magicLink, portalUrl: redirectTo }),
    });
    if (!ghlRes.ok) {
      const txt = await ghlRes.text().catch(() => "");
      console.error("GHL Unlock welkomstmail webhook faalde:", ghlRes.status, txt);
      // doorgaan; user is wel aangemaakt
    }
  }

  return res.status(200).json({
    ok: true,
    userId,
    magicLink,
    portalUrl: redirectTo,
  });
}
