import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Ondersteun zowel VITE_-prefix (lokaal) als NEXT_PUBLIC_-prefix (Vercel's Supabase-integratie).
const url =
  import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const SUPABASE_CONFIGURED = Boolean(url && key);

function makeStub(): SupabaseClient<Database> {
  const err = new Error("Supabase niet geconfigureerd (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ontbreken).");
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    order: () => builder,
    limit: () => builder,
    range: () => builder,
    maybeSingle: () => Promise.resolve({ data: null, error: err }),
    single: () => Promise.resolve({ data: null, error: err }),
    then: (resolve: (v: { data: null; error: Error }) => void) => resolve({ data: null, error: err }),
    insert: () => builder,
    update: () => builder,
    upsert: () => builder,
    delete: () => builder,
  };
  return {
    from: () => builder,
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithOtp: () => Promise.resolve({ data: null, error: err }),
      signOut: () => Promise.resolve({ error: null }),
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: err }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
        createSignedUrl: () => Promise.resolve({ data: null, error: err }),
        remove: () => Promise.resolve({ data: null, error: err }),
      }),
    },
  } as unknown as SupabaseClient<Database>;
}

export const supabase: SupabaseClient<Database> = SUPABASE_CONFIGURED
  ? createClient<Database>(url!, key!)
  : makeStub();

if (!SUPABASE_CONFIGURED) {
  console.info("Supabase niet geconfigureerd — stub-client actief. Zet VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in .env.local of in Vercel.");
}

export type { Role } from "./database.types";
