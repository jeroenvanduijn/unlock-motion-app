import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sendPushToMember } from "../_lib/push";

// Supabase DB-webhook target: triggert wanneer evaluations.published_at
// van NULL naar een waarde gaat. Stuurt push naar het lid.
// Configureer in Supabase Studio → Database → Webhooks.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const secret = process.env.UNLOCK_WEBHOOK_SECRET;
  if (secret && req.headers["x-unlock-secret"] !== secret) {
    return res.status(401).json({ error: "Ongeldig secret." });
  }

  const payload = req.body as {
    type?: "INSERT" | "UPDATE";
    record?: { id: string; member_id: string; published_at: string | null };
    old_record?: { published_at: string | null } | null;
  };

  const rec = payload?.record;
  const old = payload?.old_record;
  if (!rec) return res.status(400).json({ error: "Geen record" });

  // Alleen triggeren als published_at NU gezet is en vorige waarde NULL was.
  const becamePublished =
    rec.published_at && (!old || !old.published_at);
  if (!becamePublished) return res.status(200).json({ ok: true, skipped: true });

  await sendPushToMember(rec.member_id, {
    title: "Je heranalyse-verslag staat klaar",
    body: "Bekijk wat je coach heeft vastgelegd.",
    url: `/app/evaluatie/${rec.id}`,
    tag: "eval-published",
  });
  return res.status(200).json({ ok: true });
}
