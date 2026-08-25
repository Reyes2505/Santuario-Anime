import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uftfbidzobftjbonziql.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_f164t_IUImfvLzYxUYp-wQ_ZKqbBFAp';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
