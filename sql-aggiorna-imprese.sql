-- ═══════════════════════════════════════════════════════════════
-- PORTAFE IMPRESE V2 - AGGIORNAMENTO TABELLA + FIX + SEED
-- SOLO ADD COLUMN (non DROP/CREATE) per non rompere dati
-- ═══════════════════════════════════════════════════════════════

-- STEP 1: Aggiungi nuove colonne a imprese (solo se mancano)
ALTER TABLE imprese ADD COLUMN IF NOT EXISTS codice_fiscale TEXT;
ALTER TABLE imprese ADD COLUMN IF NOT EXISTS sede_legale TEXT;
ALTER TABLE imprese ADD COLUMN IF NOT EXISTS pec TEXT;
ALTER TABLE imprese ADD COLUMN IF NOT EXISTS codice_sdi TEXT;
ALTER TABLE imprese ADD COLUMN IF NOT EXISTS stato_durc TEXT DEFAULT 'In Verifica' CHECK (stato_durc IN ('Regolare', 'Scaduto', 'In Verifica'));
ALTER TABLE imprese ADD COLUMN IF NOT EXISTS scadenza_durc DATE;
ALTER TABLE imprese ADD COLUMN IF NOT EXISTS referente_cantiere TEXT;

COMMENT ON COLUMN imprese.codice_fiscale IS 'Codice fiscale (per fatturazione)';
COMMENT ON COLUMN imprese.pec IS 'Posta Elettronica Certificata';
COMMENT ON COLUMN imprese.codice_sdi IS 'Codice SDI per fatturazione elettronica';
COMMENT ON COLUMN imprese.stato_durc IS 'Stato Documento Unico di Regolarità Contributiva';
COMMENT ON COLUMN imprese.scadenza_durc IS 'Data scadenza DURC';

-- STEP 2: Fix profilo B&B Schiava (role='client' → 'impresa')
UPDATE profiles
SET role = 'impresa'
WHERE user_id = '4b8d9512-3847-4123-8adf-6eddee83c7d3'
  AND (role IS NULL OR role = 'client');

-- STEP 3: Seed — dati fiscali per B&B Schiava
UPDATE imprese
SET
  codice_fiscale = '09876543210',
  sede_legale = 'Via Roma 123, 80035 Nola (NA)',
  pec = 'bb-schiava@pec.test.local',
  codice_sdi = 'ABC1234',
  stato_durc = 'Regolare',
  scadenza_durc = '2026-12-31',
  referente_cantiere = 'Anna Schiava'
WHERE email_principale = 'bb-schiava@test.local';

-- STEP 4: Seed — dati fiscali per Impresa Rossi
UPDATE imprese
SET
  codice_fiscale = '01234567890',
  sede_legale = 'Via Industria 45, 80014 Qualiano (NA)',
  pec = 'impresa-rossi@pec.test.local',
  codice_sdi = 'XYZ5678',
  stato_durc = 'Scaduto',
  scadenza_durc = '2026-01-15',
  referente_cantiere = 'Mario Rossi'
WHERE email_principale = 'impresa-rossi@test.local';

-- STEP 5: Crea impresa test con DURC scaduto per i test
-- (usa un user_id fittizio — senza utente auth, visibile solo in admin)
INSERT INTO imprese (ragione_sociale, specializzazione, referente_cantiere, telefono, email_principale,
  partita_iva, codice_fiscale, sede_legale, pec, codice_sdi, stato_durc, scadenza_durc)
VALUES (
  'Beta Costruzioni S.r.l.',
  'Edile',
  'Giuseppe Verdi',
  '+39 335 9876543',
  'beta-costruzioni@nessunautente.local',
  '03456781234',
  '03456781234',
  'Via Lavoro 78, 80030 Camposano (NA)',
  'beta-costruzioni@pec.test.local',
  'DEF9012',
  'Scaduto',
  '2025-06-30'
);
