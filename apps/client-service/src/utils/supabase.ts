import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(`Missing Supabase environment variables. SUPABASE_URL: ${!!supabaseUrl}, SUPABASE_ANON_KEY: ${!!supabaseKey}`);
}

export const supabase = createClient(supabaseUrl, supabaseKey);