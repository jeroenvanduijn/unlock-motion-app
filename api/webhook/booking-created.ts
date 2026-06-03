import type { VercelRequest, VercelResponse } from "@vercel/node";
import { adminClient, sendPushToMember } from "../_lib/push";

// Supabase DB-webhook target voor INSERT op evaluation_bookings.
// Bevestigt lid + notificeert coach.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const secret = process.env.UNLOCK_WEBHOOK_SECRET;
  if (secret && req.headers["x-unlock-secret"] !== secret) {
    return res.status(401).json({ error: "Ongeldig secret." });
  }

  const payload = req.body as {
    type?: "INSERT";
    record?: { id: string; slot_id: string; member_id: string };
  };
  const rec = payload?.record;
  if (!rec) return res.status(400).json({ error: "Geen record" });

  const admin = adminClient();
  const { data: slot } = await admin
    .from("evaluation_slots")
    .select("starts_at, coach_id")
    .eq("id", rec.slot_id)
    .maybeSingle();
  if (!slot) return res.status(200).json({ ok: true, skipped: true });

  const when = new Date(slot.starts_at).toLocaleString("nl-NL", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });

  await sendPushToMember(rec.member_id, {
    title: "Evaluatie bevestigd",
    body: `Je afspraak op ${when} staat genoteerd.`,
    url: "/app/evaluatie",
    tag: "booking-confirmed",
  });
  // Coach push (coach is hier ook een 'member' in push_subscriptions? Voor V1: skip).
  return res.status(200).json({ ok: true });
}
