-- ═══════════════════════════════════════════════════════
-- PORTALE IMPRESE - SETUP DEFINITIVO
-- Schema REALE del DB (verificato via API)
-- 
-- profiles: id, creato_il, nome, email, telefono,
--   progetto_attuale, user_id, role, is_active,
--   avatar_url, created_at, updated_at
--   constraint: clienti_role_check
--
-- projects: id INTEGER, titolo, descrizione, ...
-- ═══════════════════════════════════════════════════════

-- STEP 1: Aggiorna constraint profiles.role
DO $$ BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS clienti_role_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
CHECK (role IN ('user', 'admin', 'architect', 'client', 'operator', 'senior', 'impresa'));

-- STEP 2: Tabella anagrafica imprese
CREATE TABLE IF NOT EXISTS imprese (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ragione_sociale TEXT NOT NULL,
    partita_iva TEXT,
    email_principale TEXT NOT NULL,
    telefono TEXT,
    referente TEXT,
    specializzazione TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS imprese_user_id_idx ON imprese(user_id);
CREATE INDEX IF NOT EXISTS imprese_email_idx ON imprese(email_principale);

-- STEP 3: Tabella ponte cantiere_imprese (projects.id e' INTEGER)
CREATE TABLE IF NOT EXISTS cantiere_imprese (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_cantiere INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    id_impresa UUID NOT NULL REFERENCES imprese(id) ON DELETE CASCADE,
    data_inizio_lavori DATE,
    note_incarico TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(id_cantiere, id_impresa)
);

CREATE INDEX IF NOT EXISTS cantiere_imprese_cantiere_idx ON cantiere_imprese(id_cantiere);
CREATE INDEX IF NOT EXISTS cantiere_imprese_impresa_idx ON cantiere_imprese(id_impresa);

-- STEP 4: RLS
ALTER TABLE imprese ENABLE ROW LEVEL SECURITY;
ALTER TABLE cantiere_imprese ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_all_imprese" ON imprese;
CREATE POLICY "staff_read_all_imprese" ON imprese
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE auth.uid() = profiles.user_id AND role IN ('senior', 'admin', 'operator'))
    );

DROP POLICY IF EXISTS "impresa_read_own" ON imprese;
CREATE POLICY "impresa_read_own" ON imprese
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "impresa_read_own_cantieri" ON cantiere_imprese;
CREATE POLICY "impresa_read_own_cantieri" ON cantiere_imprese
    FOR SELECT USING (
        id_impresa IN (SELECT id FROM imprese WHERE auth.uid() = imprese.user_id) OR
        EXISTS (SELECT 1 FROM profiles WHERE auth.uid() = profiles.user_id AND role IN ('senior', 'admin', 'operator'))
    );

DROP POLICY IF EXISTS "staff_insert_cantiere_imprese" ON cantiere_imprese;
CREATE POLICY "staff_insert_cantiere_imprese" ON cantiere_imprese
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE auth.uid() = profiles.user_id AND role IN ('senior', 'admin', 'operator'))
    );

-- STEP 5: Trigger updated_at
CREATE OR REPLACE FUNCTION update_imprese_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_imprese_updated_at ON imprese;
CREATE TRIGGER update_imprese_updated_at
    BEFORE UPDATE ON imprese
    FOR EACH ROW EXECUTE FUNCTION update_imprese_updated_at();

-- STEP 6: Crea record test
INSERT INTO imprese (user_id, ragione_sociale, partita_iva, email_principale, telefono, referente, specializzazione)
VALUES (
    '93c0b68c-175b-422f-9806-52691822fc24',
    'Impresa Rossi S.r.l.',
    '01234567890',
    'impresa-rossi@test.local',
    '+39 333 1234567',
    'Mario Rossi',
    'Impiantistica elettrica e termoidraulica'
);

-- STEP 7: Aggiorna profiles (colonne reali: user_id, email, role, nome)
INSERT INTO profiles (user_id, email, role, nome)
VALUES (
    '93c0b68c-175b-422f-9806-52691822fc24',
    'impresa-rossi@test.local',
    'impresa',
    'Impresa Rossi S.r.l.'
)
ON CONFLICT DO NOTHING;

-- STEP 8: Progetti disponibili (per copiare un ID)
SELECT id, titolo, stato FROM projects ORDER BY id DESC LIMIT 10;
