import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subj = process.env.VAPID_SUBJECT ?? "mailto:yari@crossfitleiden.com";
  if (!pub || !priv) throw new Error("VAPID env vars ontbreken");
  webpush.setVapidDetails(subj, pub, priv);
  configured = true;
}

export function adminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars ontbreken");
  return createClient(url, key, { auth: { persistSession: false } });
}

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
};

export async function sendPushToMember(memberId: string, payload: PushPayload) {
  ensureConfigured();
  const admin = adminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("member_id", memberId);
  if (!subs || subs.length === 0) return { sent: 0, dropped: 0 };

  let sent = 0;
  let dropped = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      );
      sent++;
    } catch (err: any) {
      // 404/410 → endpoint vervallen, opruimen.
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("id", s.id);
        dropped++;
      } else {
        console.error("push send error", err);
      }
    }
  }
  return { sent, dropped };
}
