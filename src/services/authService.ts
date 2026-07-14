import { supabase } from './supabaseClient';
import type { User } from '@supabase/supabase-js';

export type TffUser = {
  email: string;
  id: string;
  name: string;
};

const TFF_EMAIL_DOMAIN = '@tfflogistics.com';

const requireSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is nog niet ingesteld. Voeg VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY toe.');
  }

  return supabase;
};

export const isTffEmail = (email: string) => email.trim().toLowerCase().endsWith(TFF_EMAIL_DOMAIN);

export const mapAuthUser = (user: User): TffUser => ({
  email: user.email ?? '',
  id: user.id,
  name:
    typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : user.email ?? 'TFF gebruiker',
});

export async function getCurrentUser(): Promise<TffUser | undefined> {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    return undefined;
  }

  return mapAuthUser(data.user);
}

export async function signInTffUser(email: string, password: string): Promise<TffUser> {
  if (!isTffEmail(email)) {
    throw new Error('Alleen @tfflogistics.com e-mailadressen kunnen inloggen.');
  }

  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? 'Inloggen is niet gelukt.');
  }

  return mapAuthUser(data.user);
}

export async function signUpTffUser({
  email,
  name,
  password,
}: {
  email: string;
  name: string;
  password: string;
}) {
  const trimmedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (!trimmedName) {
    throw new Error('Naam is verplicht.');
  }

  if (!isTffEmail(normalizedEmail)) {
    throw new Error('Alleen @tfflogistics.com e-mailadressen kunnen een account maken.');
  }

  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        full_name: trimmedName,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data.user && data.session ? mapAuthUser(data.user) : undefined;
}

export async function signOutTffUser() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}
