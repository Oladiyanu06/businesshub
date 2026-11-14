import "server-only";

type SupabaseEnv = {
  url: string;
  anonKey: string;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and add your Supabase project credentials.`,
    );
  }
  return value;
}

export function getSupabaseEnv(): SupabaseEnv {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

export function getServiceRoleKey(): string {
  return required("SUPABASE_SERVICE_ROLE_KEY");
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
