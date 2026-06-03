import type { Protocol } from "./database.types";

export const PROTOCOLS: Protocol[] = ["frontline", "backline", "rotation", "lateral", "recovery"];

export const PROTOCOL_LABELS: Record<Protocol, string> = {
  frontline: "Frontline",
  backline: "Backline",
  rotation: "Rotaties",
  lateral: "Laterale lijn",
  recovery: "Recovery guide",
};

export const PROTOCOL_DESCRIPTIONS: Record<Protocol, string> = {
  frontline: "Voorkant van het lijf",
  backline: "Achterkant van het lijf",
  rotation: "Rotatie-stabiliteit",
  lateral: "Heupen + torso (zijwaarts)",
  recovery: "Zelfmassage (MFR), ademhaling, meditatie",
};

// Kleur per protocol — Tailwind-class fragmenten voor labels/badges
export const PROTOCOL_COLORS: Record<Protocol, { bg: string; text: string; border: string }> = {
  frontline: { bg: "bg-amber-tint",   text: "text-amber",   border: "border-amber" },
  backline:  { bg: "bg-teal-tint",    text: "text-teal-ink", border: "border-teal" },
  rotation:  { bg: "bg-sage-tint",    text: "text-sage",    border: "border-sage" },
  lateral:   { bg: "bg-ink-50",       text: "text-ink-700", border: "border-ink-300" },
  recovery:  { bg: "bg-ink-100",      text: "text-ink-700", border: "border-ink-300" },
};
