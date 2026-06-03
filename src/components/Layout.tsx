import { NavLink, Outlet, Link } from "react-router-dom";
import { useAuth, BYPASS } from "../lib/auth";
import { Icon } from "./Icon";
import { AddToHomescreenPrompt } from "./AddToHomescreenPrompt";

type IconName = Parameters<typeof Icon>[0]["name"];

type NavItem = {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
  primary?: boolean;
};

const MEMBER_NAV: NavItem[] = [
  { to: "/app", label: "Start", end: true, icon: "home", primary: true },
  { to: "/app/huiswerk", label: "Huiswerk", icon: "list", primary: true },
  { to: "/app/library", label: "Library", icon: "video", primary: true },
  { to: "/app/checkin", label: "Check-in", icon: "activity", primary: true },
  { to: "/app/evaluatie", label: "Evaluatie", icon: "calendar", primary: true },
  { to: "/app/profile", label: "Profiel", icon: "user" },
];

const COACH_NAV: NavItem[] = [
  { to: "/coach", label: "Leden", end: true, icon: "users", primary: true },
  { to: "/coach/exercises", label: "Oefeningen", icon: "list", primary: true },
  { to: "/coach/slots", label: "Slots", icon: "calendar", primary: true },
  { to: "/coach/evaluations", label: "Verslagen", icon: "clipboard-list", primary: true },
];

function switchBypassTo(role: "member" | "coach") {
  window.localStorage.setItem("dev-bypass-role", role);
  window.location.href = role === "coach" ? "/coach" : "/app";
}
function clearBypass() {
  window.localStorage.removeItem("dev-bypass-role");
  window.location.href = "/login";
}

function initialsOf(name: string | null | undefined, email: string | undefined) {
  if (name) return name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  return (email ?? "??").slice(0, 2).toUpperCase();
}

export function Layout({ variant }: { variant: "app" | "coach" }) {
  const { profile, session, signOut } = useAuth();
  const items = variant === "app" ? MEMBER_NAV : COACH_NAV;
  const mobileItems = items.filter((n) => n.primary).slice(0, 5);
  const variantLabel = variant === "coach" ? "Coach" : "Lid";
  const initials = initialsOf(profile?.full_name, session?.user.email);

  const renderNavLink = (n: NavItem) => (
    <NavLink
      key={n.to}
      to={n.to}
      end={n.end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors relative ` +
        (isActive
          ? "bg-teal-tint text-teal-ink"
          : "text-ink-700 hover:bg-ink-50")
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute left-[-24px] top-2 bottom-2 w-[3px] bg-teal rounded-r" />}
          <Icon name={n.icon} size={18} />
          <span className="flex-1">{n.label}</span>
        </>
      )}
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-bg">
      {BYPASS && (
        <div className="bg-amber-tint border-b border-amber text-ink-900 text-xs px-5 py-2 flex items-center justify-center gap-3 flex-wrap">
          <span>Dev-bypass — ingelogd als <strong>{BYPASS}</strong>.</span>
          <button onClick={() => switchBypassTo("member")} className="underline disabled:no-underline disabled:opacity-50" disabled={BYPASS === "member"}>Lid</button>
          <button onClick={() => switchBypassTo("coach")} className="underline disabled:no-underline disabled:opacity-50" disabled={BYPASS === "coach"}>Coach</button>
          <button onClick={clearBypass} className="underline">Uitschakelen</button>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[260px_1fr] min-h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col gap-1 bg-white border-r border-ink-100 p-6 sticky top-0 h-screen">
          <Link to={variant === "coach" ? "/coach" : "/app"} className="flex items-center gap-3 px-3 pb-7">
            <div className="w-11 h-11 rounded-2xl bg-teal text-white flex items-center justify-center font-display font-semibold text-lg">U</div>
            <div className="leading-tight">
              <div className="h-display text-[22px]">Unlock Motion</div>
              <div className="text-[11px] uppercase tracking-[.14em] text-ink-500 mt-0.5">{variantLabel}</div>
            </div>
          </Link>

          <div className="flex flex-col gap-0.5 overflow-y-auto -mx-2 px-2">
            {items.map(renderNavLink)}
          </div>

          <div className="mt-auto pt-3 border-t border-ink-100 flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-amber-tint text-ink-900 flex items-center justify-center font-display font-medium text-sm">
              {initials}
            </div>
            <div className="flex-1 leading-tight min-w-0">
              <div className="text-[13px] font-medium text-ink-900 truncate">{profile?.full_name ?? "Welkom"}</div>
              <div className="text-[11px] text-ink-500 truncate">{session?.user.email}</div>
            </div>
            <button onClick={signOut} className="text-ink-500 hover:text-teal p-1.5" title="Uitloggen">
              <Icon name="log-out" size={16} />
            </button>
          </div>
        </aside>

        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-ink-100 px-4 py-3 flex items-center justify-between gap-3">
          <Link to={variant === "coach" ? "/coach" : "/app"} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal text-white flex items-center justify-center font-display font-semibold">U</div>
            <div className="leading-tight">
              <div className="h-display text-[18px]">Unlock Motion</div>
              <div className="text-[10px] uppercase tracking-[.12em] text-ink-500">{variantLabel}</div>
            </div>
          </Link>
          <button onClick={signOut} className="btn-ghost btn-sm" title="Uitloggen">
            <Icon name="log-out" size={14} />
          </button>
        </header>

        {/* Main */}
        <main className="px-5 py-6 pb-28 lg:px-10 lg:py-10 lg:pb-12 max-w-[1100px] w-full">
          <Outlet />
        </main>

        {variant === "app" && <AddToHomescreenPrompt />}
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-ink-100 grid gap-0 px-1 py-2 pb-[calc(8px+env(safe-area-inset-bottom))]"
        style={{ gridTemplateColumns: `repeat(${mobileItems.length}, minmax(0, 1fr))` }}
      >
        {mobileItems.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-0.5 text-[10px] transition-colors relative ` +
              (isActive ? "text-teal font-medium" : "text-ink-500")
            }
          >
            <Icon name={n.icon} size={20} />
            <span className="tracking-tight truncate max-w-full">{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
