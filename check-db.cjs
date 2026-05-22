const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function main() {
  // Controlla se activities esiste
  const { data: actSample, error: actErr } = await supabase.from('activities').select('*').limit(1);
  if (actErr && actErr.code === 'PGRST116') {
    console.log('❌ Tabella activities non esiste');
  } else if (actErr) {
    console.log('Tabella activities esiste ma:', actErr.message);
  } else {
    console.log('✅ Tabella activities esiste');
  }

  // Controlla se project_tasks esiste
  const { data: ptSample, error: ptErr } = await supabase.from('project_tasks').select('*').limit(1);
  if (ptErr && ptErr.code === 'PGRST116') {
    console.log('❌ Tabella project_tasks non esiste');
  } else if (ptErr) {
    console.log('Tabella project_tasks:', ptErr.message);
  } else {
    console.log('✅ Tabella project_tasks esiste');
  }

  // Controlla se tasks esiste
  const { data: tSample, error: tErr } = await supabase.from('tasks').select('*').limit(1);
  if (tErr && tErr.code === 'PGRST116') {
    console.log('❌ Tabella tasks non esiste');
  } else if (tErr) {
    console.log('Tabella tasks:', tErr.message);
  } else {
    console.log('✅ Tabella tasks esiste');
  }

  // Sample projects con avanzamento
  const { data: projs } = await supabase.from('projects').select('id, titolo, data_consegna, avanzamento, status').limit(5);
  if (projs) {
    console.log('\n📊 Sample progetti:');
    projs.forEach(function(p) { console.log('  -', p.titolo, '| avanzamento:', p.avanzamento, '| data_consegna:', p.data_consegna, '| status:', p.status); });
  }
}

main().catch(console.error);
