import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  console.log('=== VERIFICA DATABASE ===\n');

  // 1) Colonne imprese
  const { data: imp } = await admin.from('imprese').select('*').limit(1);
  if (imp && imp[0]) {
    const cols = Object.keys(imp[0]);
    const check = ['codice_fiscale','sede_legale','pec','codice_sdi','stato_durc','inps_sede','codice_inps','inail_posizione','ccnl','cassa_edile','matricola_cassa_edile','cc_banca','cc_iban','cc_intestatario'];
    const mancanti = check.filter(c => !cols.includes(c));
    if (mancanti.length === 0) console.log('✅ imprese: tutte le colonne presenti');
    else console.log('❌ imprese: mancano ' + mancanti.join(', '));
    console.log('   Colonne totali:', cols.length);
  } else {
    console.log('❌ imprese: nessun dato');
  }

  // 2) Tabella cantiere_impresa_economia
  const { data: eco, error: ee } = await admin.from('cantiere_impresa_economia').select('*').limit(1);
  if (!ee) console.log('✅ cantiere_impresa_economia: OK, ' + (eco?.length || 0) + ' righe');
  else console.log('❌ cantiere_impresa_economia: ' + ee.message);

  // 3) Tabella computi_metrici
  const { data: cm, error: ce } = await admin.from('computi_metrici').select('*').limit(1);
  if (!ce) console.log('✅ computi_metrici: OK, ' + (cm?.length || 0) + ' righe');
  else console.log('❌ computi_metrici: ' + ce.message);

  // 4) Tabella voci_computo
  const { data: vc, error: ve } = await admin.from('voci_computo').select('*').limit(1);
  if (!ve) console.log('✅ voci_computo: OK, ' + (vc?.length || 0) + ' righe');
  else console.log('❌ voci_computo: ' + ve.message);

  // 5) Test join per dettaglio-progetto (con referente_cantiere ora)
  const { data: join, error: je } = await admin
    .from('cantiere_imprese')
    .select('id_cantiere, data_inizio_lavori, note_incarico, imprese!inner(id, ragione_sociale, partita_iva, specializzazione, telefono, email_principale, referente_cantiere, stato_durc)')
    .eq('id_cantiere', 14);
  if (!je) console.log('✅ Join imprese con stato_durc: OK, ' + (join?.length || 0) + ' righe');
  else console.log('❌ Join imprese: ' + je.message);

  console.log('\n✅ Verifica completata!');
  process.exit(0);
}
main();
