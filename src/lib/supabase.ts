import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://evjqsvyltolykjzcunjx.supabase.co';
const supabaseKey = 'sb_publishable__NV9chMuW51cbqk7wxMSfQ_29r2-aMS';

export const supabase = createClient(supabaseUrl, supabaseKey);
