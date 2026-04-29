import type { NextConfig } from 'next';

const config: NextConfig = {
  // Provide fallback env vars during build so Supabase client can be instantiated.
  // These are overridden at runtime by the real values from Vercel env vars.
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key',
  },
};

export default config;
