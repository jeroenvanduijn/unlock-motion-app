import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrMsg(null);
    try {
      const res = await fetch("/api/request-login-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Kon login-link niet versturen.");
      }
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrMsg(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="card w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-teal text-white flex items-center justify-center font-display font-semibold text-xl">U</div>
          <div>
            <div className="eyebrow">Unlock Motion</div>
            <h1 className="h-display text-[28px] text-ink-900">Inloggen</h1>
          </div>
        </div>

        {status === "sent" ? (
          <div className="space-y-3">
            <p className="text-ink-700">
              Check je inbox — als <strong>{email}</strong> bij ons bekend is, sturen we je een login-link.
            </p>
            <p className="text-sm muted">
              Geen mail ontvangen? Check je spam, of vraag Yari om je te koppelen.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">E-mailadres</label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="jij@voorbeeld.nl"
              />
            </div>
            {errMsg && <p className="text-sm text-red-600">{errMsg}</p>}
            <button type="submit" disabled={status === "sending"} className="btn-primary btn-lg w-full">
              {status === "sending" ? "Versturen…" : "Stuur login-link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
