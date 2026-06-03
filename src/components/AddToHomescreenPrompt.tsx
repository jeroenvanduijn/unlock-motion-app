import { useEffect, useState } from "react";
import { Icon } from "./Icon";

const DISMISS_KEY = "unlock-pwa-prompt-dismissed-v1";

type Platform = "ios" | "android" | "other";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if ((window.navigator as { standalone?: boolean }).standalone === true) return true;
  return window.matchMedia("(display-mode: standalone)").matches;
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function AddToHomescreenPrompt() {
  const [platform] = useState<Platform>(() => detectPlatform());
  const [open, setOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (platform === "other") return;
    if (isStandalone()) return;
    if (window.localStorage.getItem(DISMISS_KEY)) return;
    const timer = window.setTimeout(() => setOpen(true), 800);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, [platform]);

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  }

  async function installNative() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 fadeInUp"
      style={{ background: "rgba(15, 32, 31, 0.55)" }}
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
    >
      <div className="card p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "var(--teal-tint)", color: "var(--teal)" }}>
              <Icon name="phone" size={20} />
            </div>
            <div>
              <div className="eyebrow-ink mb-0.5">Snelkoppeling</div>
              <h2 className="h-display text-[20px] text-ink-900" style={{ textTransform: "none", letterSpacing: 0 }}>
                Zet Unlock op je beginscherm
              </h2>
            </div>
          </div>
          <button onClick={dismiss} className="text-ink-500 hover:text-ink-900 p-1" aria-label="Sluiten">
            <Icon name="x" size={18} />
          </button>
        </div>

        <p className="text-ink-700 text-[14px] mb-4">
          Open de app voortaan met één tik vanaf je startscherm — sneller dan via je browser, en push-notificaties (op iOS) werken alleen zo.
        </p>

        {platform === "ios" ? (
          <ol className="flex flex-col gap-2.5 text-[14px] text-ink-700 mb-5">
            <Step n={1}>Tik op de <strong>deel-knop</strong> (vierkant met pijl) onderaan</Step>
            <Step n={2}>Scroll naar beneden en kies <strong>"Zet op beginscherm"</strong></Step>
            <Step n={3}>Tik rechtsboven op <strong>"Voeg toe"</strong></Step>
          </ol>
        ) : (
          <ol className="flex flex-col gap-2.5 text-[14px] text-ink-700 mb-5">
            <Step n={1}>Open het <strong>Chrome-menu</strong> (drie puntjes)</Step>
            <Step n={2}>Kies <strong>"App installeren"</strong> of <strong>"Toevoegen aan startscherm"</strong></Step>
            <Step n={3}>Bevestig — klaar.</Step>
          </ol>
        )}

        <div className="flex gap-2 flex-wrap">
          {deferredPrompt && (
            <button type="button" onClick={installNative} className="btn-cta">
              <Icon name="phone" size={14} /> Installeer nu
            </button>
          )}
          <button type="button" onClick={dismiss} className="btn-ghost">
            Snap het, sluiten
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold mt-0.5" style={{ background: "var(--ink-50)", color: "var(--ink-700)" }}>
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
