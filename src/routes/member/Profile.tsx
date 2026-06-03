import { useState, useEffect } from "react";
import { useAuth } from "../../lib/auth";
import { ensurePushSubscription, registerPushOnServer, isStandalone, pushSupported } from "../../lib/push";
import { Icon } from "../../components/Icon";

export default function Profile() {
  const { profile, session, signOut } = useAuth();
  const [pushStatus, setPushStatus] = useState<"unknown" | "granted" | "denied" | "default" | "unsupported">("unknown");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported()) {
      setPushStatus("unsupported");
      return;
    }
    setPushStatus(Notification.permission);
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const sub = await ensurePushSubscription();
      if (sub && session?.access_token) {
        await registerPushOnServer(sub, session.access_token);
        setPushStatus("granted");
      } else {
        setPushStatus(Notification.permission);
      }
    } finally {
      setBusy(false);
    }
  }

  const standalone = isStandalone();

  return (
    <div className="space-y-5 max-w-lg">
      <header>
        <div className="eyebrow mb-1">Account</div>
        <h1 className="h-display h2 text-ink-900">Profiel</h1>
      </header>

      <section className="card p-5 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-ink-900">{profile?.full_name ?? "Onbekend"}</div>
            <div className="text-sm muted">{session?.user.email}</div>
          </div>
          <button onClick={signOut} className="btn-ghost btn-sm"><Icon name="log-out" size={14} /> Uitloggen</button>
        </div>
        {profile?.program_start_date && (
          <div className="text-sm muted">
            Programma: {new Date(profile.program_start_date).toLocaleDateString("nl-NL")}
            {profile.program_end_date && (
              <> tot {new Date(profile.program_end_date).toLocaleDateString("nl-NL")}</>
            )}
          </div>
        )}
      </section>

      <section className="card p-5 space-y-3">
        <div className="flex items-center gap-3">
          <Icon name="bell" size={18} />
          <h2 className="font-semibold text-ink-900">Push-notificaties</h2>
        </div>
        {pushStatus === "unsupported" && (
          <p className="text-sm muted">Push wordt niet ondersteund in deze browser.</p>
        )}
        {pushStatus !== "unsupported" && !standalone && (
          <div className="rounded-xl bg-amber-tint p-3 text-sm text-ink-700">
            Installeer de app eerst op je beginscherm (zie pop-up bij start) voordat je push aanzet — vooral op iPhone is dat verplicht.
          </div>
        )}
        {pushStatus === "granted" && (
          <p className="text-sm text-sage">Push staat aan ✓</p>
        )}
        {pushStatus === "denied" && (
          <p className="text-sm text-ink-700">Push staat uit (geweigerd). Wijzig in je browser-instellingen.</p>
        )}
        {(pushStatus === "default" || pushStatus === "unknown") && (
          <button onClick={enable} disabled={busy || !standalone} className="btn-primary btn-sm">
            <Icon name="bell" size={14} /> Zet push aan
          </button>
        )}
      </section>
    </div>
  );
}
