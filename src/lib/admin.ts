// src/lib/admin.ts
import { supabase } from './supabase';

export async function esAdmin(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;

  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id)
    .single();

  return data?.role === 'admin';
}

export async function getRolUsuario(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return 'guest';

  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id)
    .single();

  return data?.role || 'user';
}

export async function hacerAdmin(userId: string) {
  const { error } = await supabase
    .from('user_roles')
    .upsert({ user_id: userId, role: 'admin' });
  
  return !error;
}

export async function quitarAdmin(userId: string) {
  const { error } = await supabase
    .from('user_roles')
    .upsert({ user_id: userId, role: 'user' });
  
  return !error;
}
