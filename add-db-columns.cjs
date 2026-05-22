const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL || 'https://amhqqszzxmrphisxlsnj.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  console.log('🔍 Verifico colonne projects...');

  // Usa fetch diretto per chiamate raw SQL tramite API REST
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Ottieni un sample per vedere le colonne attuali
  const { data: sample } = await supabase.from('projects').select('*').limit(1);
  if (sample && sample.length > 0) {
    const cols = Object.keys(sample[0]);
    console.log('Colonne attuali projects:', cols.join(', '));

    if (!cols.includes('avanzamento')) {
      console.log('⚠️ avanzamento mancante, provo ad aggiungerlo...');
    } else {
      console.log('✅ avanzamento esiste');
    }
    if (!cols.includes('data_consegna')) {
      console.log('⚠️ data_consegna mancante');
    } else {
      console.log('✅ data_consegna esiste');
    }
  }

  // Usa il client admin per fare UPDATE con la service key (bypassa RLS)
  // Le colonne vanno aggiunte via Supabase Dashboard SQL Editor
  console.log('');
  console.log('📋 Per aggiungere le colonne mancanti, esegui questo SQL sulla Supabase Dashboard:');
  console.log('   https://supabase.com/dashboard/project/amhqqszzxmrphisxlsnj/sql/new');
  console.log('');
  console.log('   ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS data_consegna DATE;');
  console.log('   ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS avanzamento INTEGER DEFAULT 0;');
  console.log('   CREATE TABLE IF NOT EXISTS public.activities (');
  console.log('     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,');
  console.log("     user_id UUID, project_id UUID, action TEXT NOT NULL,");
  console.log("     entity_type TEXT, entity_id UUID,");
  console.log("     details JSONB DEFAULT '{}', created_at TIMESTAMP WITH TIME ZONE DEFAULT now()");
  console.log('   );');
}

main().catch(console.error);
