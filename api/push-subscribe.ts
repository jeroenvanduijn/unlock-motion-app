import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// Slaat een web-push subscription op voor de ingelogde gebruiker.
// Vereist Authorization: Bearer <supabase-access-token> header.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return res.status(500).json({ error: "Supabase env-vars ontbreken." });

  // Authorization: gebruik anon client met user-token om uid te bepalen.
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Niet ingelogd." });
  const userJwt = authHeader.slice("Bearer ".length);

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!anonKey) return res.status(500).json({ error: "Anon key ontbreekt." });

  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${userJwt}` } },
  });
  const { data: u } = await userClient.auth.getUser();
  if (!u.user) return res.status(401).json({ error: "Token ongeldig." });

  const body = (req.body ?? {}) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
    user_agent?: string;
  };
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return res.status(400).json({ error: "Onvolledige subscription." });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  await admin.from("push_subscriptions").upsert(
    {
      member_id: u.user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      user_agent: body.user_agent ?? null,
    },
    { onConflict: "endpoint" },
  );

  return res.status(200).json({ ok: true });
}
