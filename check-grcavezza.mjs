import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  // Cerca grcavezza in tutte le tabelle di profilo
  const email = 'grcavezza@gmail.com';
  for (const table of ['operatori_profiles', 'profiles', 'clienti_profiles']) {
    const { data } = await admin.from(table).select('*').eq('email', email);
    console.log(`\n=== ${table} ===`);
    if (data && data.length > 0) console.log(JSON.stringify(data, null, 2));
    else console.log('Nessun risultato');
  }

  // Cerca per user_id
  const { data: users } = await admin.rpc('exec_sql', {
    query: `SELECT id, email FROM auth.users WHERE email LIKE '%grcavezza%' OR email LIKE '%admin%' LIMIT 5;`
  }).maybeSingle();
  console.log('\n=== auth.users search ===', users);

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
