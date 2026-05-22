const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

(async () => {
  var { data: ops } = await s.from('operatori_profiles').select('*').limit(1);
  if (ops && ops.length > 0) {
    console.log('Colonne REALI di operatori_profiles:');
    Object.keys(ops[0]).forEach(function(c) {
      console.log('  - ' + c + ': ' + typeof ops[0][c]);
    });
  } else {
    console.log('Nessun record trovato');
  }
})();
