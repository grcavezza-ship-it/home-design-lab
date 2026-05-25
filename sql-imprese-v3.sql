-- ═══════════════════════════════════════════════════════════════════════════
-- PORTAFE IMPRESE V3 - Dati fiscali, INPS, economia cantieri
-- DA ESEGUIRE SU Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- STEP 1: Aggiungi colonne mancanti a imprese
ALTER TABLE imprese ADD COLUMN IF NOT EXISTS codice_fiscale TEXT;
ALTER TABLE imprese ADD COLUMN IF NOT EXISTS sede_legale TEXT;
ALTER TABLE imprese ADD COLUMN IF NOT EXISTS pec TEXT;
ALTER TABLE imprese ADD COLUMN IF NOT EXISTS codice_sdi TEXT;
ALTER TABLE imprese ADD COLUMN IF NOT EXISTS stato_durc TEXT DEFAULT 'In Verifica';
ALTER TABLE imprese ADD COLUMN IF NOT EXISTS scadenza_durc DATE;
ALTER TABLE imprese ADD COLUMN IF NOT EXISTS referente_cantiere TEXT;
ALTER TABLE imprese ADD COLUMN IF NOT EXISTS inps_sede TEXT;
ALTER TABLE imprese ADD COLUMN IF NOT EXISTS codice_inps TEXT;
ALTER TABLE imprese ADD COLUMN IF NOT EXISTS inail_posizione TEXT;
ALTER TABLE imprese ADD COLUMN IF NOT EXISTS ccnl TEXT;
ALTER TABLE imprese ADD COLUMN IF NOT EXISTS cc_banca TEXT;
ALTER TABLE imprese ADD COLUMN IF NOT EXISTS cc_iban TEXT;
ALTER TABLE imprese ADD COLUMN IF NOT EXISTS cc_intestatario TEXT;
ALTER TABLE imprese ADD COLUMN IF NOT EXISTS cassa_edile TEXT;
ALTER TABLE imprese ADD COLUMN IF NOT EXISTS matricola_cassa_edile TEXT;

COMMENT ON COLUMN imprese.inps_sede IS 'Sede INPS di competenza (es. INPS Napoli)';
COMMENT ON COLUMN imprese.codice_inps IS 'Codice INPS dell''azienda (matricola)';
COMMENT ON COLUMN imprese.inail_posizione IS 'Posizione assicurativa territoriale INAIL';
COMMENT ON COLUMN imprese.ccnl IS 'Contratto Collettivo Nazionale del Lavoro applicato';
COMMENT ON COLUMN imprese.cc_banca IS 'Istituto bancario';
COMMENT ON COLUMN imprese.cc_iban IS 'IBAN per pagamenti';
COMMENT ON COLUMN imprese.cc_intestatario IS 'Intestatario del conto corrente';
COMMENT ON COLUMN imprese.cassa_edile IS 'Cassa Edile di competenza';
COMMENT ON COLUMN imprese.matricola_cassa_edile IS 'Matricola Cassa Edile';

-- STEP 2: Crea tabella economia cantieri per impresa
CREATE TABLE IF NOT EXISTS cantiere_impresa_economia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cantiere INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  id_impresa UUID NOT NULL REFERENCES imprese(id) ON DELETE CASCADE,
  importo_contratto DECIMAL(12,2) DEFAULT 0,
  importo_lavorato DECIMAL(12,2) DEFAULT 0,
  importo_fatturato DECIMAL(12,2) DEFAULT 0,
  importo_percepito DECIMAL(12,2) DEFAULT 0,
  ritenute DECIMAL(12,2) DEFAULT 0,
  note_economiche TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(id_cantiere, id_impresa)
);

COMMENT ON TABLE cantiere_impresa_economia IS 'Situazione economica per ogni cantiere/impresa';
COMMENT ON COLUMN cantiere_impresa_economia.importo_contratto IS 'Importo totale contrattuale';
COMMENT ON COLUMN cantiere_impresa_economia.importo_lavorato IS 'Avanzamento lavori già eseguiti';
COMMENT ON COLUMN cantiere_impresa_economia.importo_fatturato IS 'Totale fatture emesse';
COMMENT ON COLUMN cantiere_impresa_economia.importo_percepito IS 'Importo già pagato dallo studio';
COMMENT ON COLUMN cantiere_impresa_economia.ritenute IS 'Ritenute (0.50% ex art. 4 DPR 207/2010, ecc)';

-- STEP 3: Dati fiscali per B&B Schiava
UPDATE imprese SET
  codice_fiscale = '09876543210',
  sede_legale = 'Via Roma 123, 80035 Nola (NA)',
  pec = 'bb-schiava@pec.test.local',
  codice_sdi = 'ABC1234',
  stato_durc = 'Regolare',
  scadenza_durc = '2026-12-31',
  referente_cantiere = 'Anna Schiava',
  inps_sede = 'INPS Napoli Est',
  codice_inps = '12345678',
  inail_posizione = 'NA/123456/78',
  ccnl = 'Edilizia Industria',
  cc_banca = 'Intesa Sanpaolo',
  cc_iban = 'IT12A1234567890123456789012',
  cc_intestatario = 'B&B Schiava S.r.l.s.',
  cassa_edile = 'CassEdile Napoli',
  matricola_cassa_edile = 'CE12345'
WHERE email_principale = 'bb-schiava@test.local';

-- STEP 4: Dati fiscali Impresa Rossi
UPDATE imprese SET
  codice_fiscale = '01234567890',
  sede_legale = 'Via Industria 45, 80014 Qualiano (NA)',
  pec = 'impresa-rossi@pec.test.local',
  codice_sdi = 'XYZ5678',
  stato_durc = 'Scaduto',
  scadenza_durc = '2026-01-15',
  referente_cantiere = 'Mario Rossi',
  inps_sede = 'INPS Napoli Ovest',
  codice_inps = '87654321',
  inail_posizione = 'NA/654321/12',
  ccnl = 'Edilizia Artigianato',
  cc_banca = 'Unicredit',
  cc_iban = 'IT34B9876543210987654321098',
  cc_intestatario = 'Impresa Rossi S.r.l.',
  cassa_edile = 'CassEdile Napoli',
  matricola_cassa_edile = 'CE67890'
WHERE email_principale = 'impresa-rossi@test.local';

-- STEP 5: Seedi economia cantieri per B&B Schiava
INSERT INTO cantiere_impresa_economia (id_cantiere, id_impresa, importo_contratto, importo_lavorato, importo_fatturato, importo_percepito, ritenute, note_economiche)
VALUES
  (8, (SELECT id FROM imprese WHERE email_principale='bb-schiava@test.local'),
   45000.00, 18000.00, 12000.00, 8000.00, 60.00,
   'Stato avanzamento: opere murarie completate al 40%. Saldo attivo: 8700€ da percepire dopo SAL successivo.'),
  (14, (SELECT id FROM imprese WHERE email_principale='bb-schiava@test.local'),
   72000.00, 32400.00, 25000.00, 18000.00, 125.00,
   'Ristrutturazione bagni: primo SAL liquidato. Da fatturare: 7400€. Avanzamento 45%.')
ON CONFLICT (id_cantiere, id_impresa) DO UPDATE SET
  importo_contratto = EXCLUDED.importo_contratto,
  importo_lavorato = EXCLUDED.importo_lavorato,
  importo_fatturato = EXCLUDED.importo_fatturato,
  importo_percepito = EXCLUDED.importo_percepito,
  ritenute = EXCLUDED.ritenute,
  note_economiche = EXCLUDED.note_economiche;

-- STEP 6: Seed economia per Impresa Rossi
INSERT INTO cantiere_impresa_economia (id_cantiere, id_impresa, importo_contratto, importo_lavorato, importo_fatturato, importo_percepito, ritenute, note_economiche)
VALUES
  (1, (SELECT id FROM imprese WHERE email_principale='impresa-rossi@test.local'),
   95000.00, 47500.00, 40000.00, 35000.00, 200.00,
   'Impiantistica elettrica Attico Prisma: SAL 1 saldato, SAL 2 in emissione.')
ON CONFLICT (id_cantiere, id_impresa) DO NOTHING;
