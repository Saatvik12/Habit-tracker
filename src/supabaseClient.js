import { createClient } from '@supabase/supabase-js';

// Replace these with your own values from Supabase → Project Settings → API
const SUPABASE_URL = 'https://nijiadcjajcairygfsih.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cyKVQVQ7FDk2p6d1ie7Ldg_uu9-Rlx-';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

