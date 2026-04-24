import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase environment variables. Please check your .env file.'
  );
}

const isPlaceholder = !supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder.supabase.co');

// Export configuration status for other services
export const isSupabaseConfigured = !isPlaceholder;

// Diagnostic logging for production debugging
if (import.meta.env.PROD) {
  console.log('Supabase Configuration Status:', {
    configured: isSupabaseConfigured,
    urlSet: !!supabaseUrl,
    keySet: !!supabaseAnonKey,
    isPlaceholder: isPlaceholder,
    urlStart: supabaseUrl ? supabaseUrl.substring(0, 12) + '...' : 'none'
  });
}

/**
 * Creates a guarded Supabase client.
 that prevents network errors when unconfigured.
 * Returns no-op builders that resolve to empty/null values.
 */
const createGuardedClient = (realClient: any) => {
  // Only use the guard in DEVELOPMENT when using a PLACEHOLDER.
  // In production, we want errors to be visible if configuration is missing.
  if (import.meta.env.PROD || isSupabaseConfigured) return realClient;

  const noop = () => Promise.resolve({ data: null, error: { message: 'Supabase unconfigured', code: 'UNCONFIGURED' } });
  const noopArray = () => Promise.resolve({ data: null, error: { message: 'Supabase unconfigured', code: 'UNCONFIGURED' } });

  const builder = {
    select: noopArray,
    insert: noop,
    update: noop,
    upsert: noop,
    delete: noop,
    eq: function() { return this; },
    neq: function() { return this; },
    gt: function() { return this; },
    lt: function() { return this; },
    gte: function() { return this; },
    lte: function() { return this; },
    like: function() { return this; },
    ilike: function() { return this; },
    is: function() { return this; },
    in: function() { return this; },
    contains: function() { return this; },
    containedBy: function() { return this; },
    rangeGt: function() { return this; },
    rangeGte: function() { return this; },
    rangeLt: function() { return this; },
    rangeLte: function() { return this; },
    rangeAdjacent: function() { return this; },
    overlaps: function() { return this; },
    match: function() { return this; },
    not: function() { return this; },
    or: function() { return this; },
    filter: function() { return this; },
    order: function() { return this; },
    limit: function() { return this; },
    range: function() { return this; },
    abortSignal: function() { return this; },
    single: noop,
    maybeSingle: noop,
    csv: function() { return this; },
    returns: function() { return this; },
  };

  return new Proxy(realClient, {
    get(target, prop) {
      if (prop === 'from') return () => builder;
      if (prop === 'auth') return {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: noop,
        signUp: noop,
        signOut: noop,
      };
      if (prop === 'storage') return { from: () => ({ upload: noop, download: noop, list: noopArray }) };
      return target[prop];
    }
  });
};

export const supabase = createGuardedClient(
  createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  )
);

