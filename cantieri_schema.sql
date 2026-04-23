-- Schema SQL per Gestione Cantieri
-- Esegui questo codice nell'SQL Editor di Supabase dopo lo schema esistente

-- NOTA: Vedo che esistono già tabelle 'tasks' e 'operatori_profiles'
-- Userò nomi diversi per evitare conflitti

-- Aggiungi UNIQUE constraint su profiles.user_id se non esiste
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'profiles_user_id_unique_idx'
    ) THEN
        CREATE UNIQUE INDEX profiles_user_id_unique_idx ON profiles(user_id);
    END IF;
END $$;

-- Aggiungi UNIQUE constraint su operatori_profiles.user_id se non esiste
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'operatori_profiles_user_id_unique_idx'
    ) THEN
        CREATE UNIQUE INDEX operatori_profiles_user_id_unique_idx ON operatori_profiles(user_id);
    END IF;
END $$;

-- Tabella Cantieri (Construction Sites)
CREATE TABLE IF NOT EXISTS cantieri (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_progetto TEXT NOT NULL,
    indirizzo TEXT,
    data_inizio DATE,
    drive_folder_id TEXT, -- ID della cartella Google Drive
    riferimenti TEXT, -- Informazioni aggiuntive
    stato TEXT DEFAULT 'attivo' CHECK (stato IN ('attivo', 'completato', 'sospeso')),
    creato_da UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella Cantiere Tasks (Checklist items) - usa nome diverso da 'tasks' esistente
CREATE TABLE IF NOT EXISTS cantiere_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cantiere_id UUID REFERENCES cantieri(id) ON DELETE CASCADE,
    descrizione TEXT NOT NULL,
    completato BOOLEAN DEFAULT FALSE,
    assegnato_a UUID REFERENCES operatori_profiles(user_id) ON DELETE SET NULL,
    categoria TEXT DEFAULT 'generale', -- es. Rilievo, Impiantistica, Sicurezza
    priorita TEXT DEFAULT 'media' CHECK (priorita IN ('bassa', 'media', 'alta')),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella Assegnazioni Cantieri (Many-to-many relationship)
CREATE TABLE IF NOT EXISTS cantieri_assegnazioni (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cantiere_id UUID REFERENCES cantieri(id) ON DELETE CASCADE,
    operatore_id UUID REFERENCES operatori_profiles(user_id) ON DELETE CASCADE,
    ruolo TEXT DEFAULT 'operatore' CHECK (ruolo IN ('operatore', 'responsabile', 'supervisore')),
    data_assegnazione DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(cantiere_id, operatore_id)
);

-- Indici per Cantieri
CREATE INDEX IF NOT EXISTS cantieri_creato_da_idx ON cantieri(creato_da);
CREATE INDEX IF NOT EXISTS cantieri_stato_idx ON cantieri(stato);
CREATE INDEX IF NOT EXISTS cantieri_drive_folder_id_idx ON cantieri(drive_folder_id);

-- Indici per Cantiere Tasks
CREATE INDEX IF NOT EXISTS cantiere_tasks_cantiere_id_idx ON cantiere_tasks(cantiere_id);
CREATE INDEX IF NOT EXISTS cantiere_tasks_assegnato_a_idx ON cantiere_tasks(assegnato_a);
CREATE INDEX IF NOT EXISTS cantiere_tasks_completato_idx ON cantiere_tasks(completato);
CREATE INDEX IF NOT EXISTS cantiere_tasks_categoria_idx ON cantiere_tasks(categoria);

-- Indici per Assegnazioni
CREATE INDEX IF NOT EXISTS cantieri_assegnazioni_cantiere_id_idx ON cantieri_assegnazioni(cantiere_id);
CREATE INDEX IF NOT EXISTS cantieri_assegnazioni_operatore_id_idx ON cantieri_assegnazioni(operatore_id);

-- Trigger per updated_at su cantieri
DROP TRIGGER IF EXISTS update_cantieri_updated_at ON cantieri;
CREATE TRIGGER update_cantieri_updated_at
    BEFORE UPDATE ON cantieri
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger per updated_at su cantiere_tasks
DROP TRIGGER IF EXISTS update_cantiere_tasks_updated_at ON cantiere_tasks;
CREATE TRIGGER update_cantiere_tasks_updated_at
    BEFORE UPDATE ON cantiere_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) per Cantieri
ALTER TABLE cantieri ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
DROP POLICY IF EXISTS "Admins full access cantieri" ON cantieri;
CREATE POLICY "Admins full access cantieri"
    ON cantieri FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
    );

-- Policy: Operators can read assigned cantieri
DROP POLICY IF EXISTS "Operators can read assigned cantieri" ON cantieri;
CREATE POLICY "Operators can read assigned cantieri"
    ON cantieri FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM cantieri_assegnazioni ca
            WHERE ca.cantiere_id = cantieri.id 
            AND ca.operatore_id = auth.uid()
        )
    );

-- Policy: Creators can read their own cantieri
DROP POLICY IF EXISTS "Creators can read own cantieri" ON cantieri;
CREATE POLICY "Creators can read own cantieri"
    ON cantieri FOR SELECT
    USING (creato_da = auth.uid());

-- Row Level Security (RLS) per Cantiere Tasks
ALTER TABLE cantiere_tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Admins full access cantiere_tasks
DROP POLICY IF EXISTS "Admins full access cantiere_tasks" ON cantiere_tasks;
CREATE POLICY "Admins full access cantiere_tasks"
    ON cantiere_tasks FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
    );

-- Policy: Operators can read tasks from assigned cantieri
DROP POLICY IF EXISTS "Operators can read assigned cantiere_tasks" ON cantiere_tasks;
CREATE POLICY "Operators can read assigned cantiere_tasks"
    ON cantiere_tasks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM cantieri_assegnazioni ca
            WHERE ca.cantiere_id = cantiere_tasks.cantiere_id 
            AND ca.operatore_id = auth.uid()
        )
    );

-- Policy: Operators can update their assigned tasks
DROP POLICY IF EXISTS "Operators can update assigned cantiere_tasks" ON cantiere_tasks;
CREATE POLICY "Operators can update assigned cantiere_tasks"
    ON cantiere_tasks FOR UPDATE
    USING (assegnato_a = auth.uid());

-- Row Level Security (RLS) per Assegnazioni
ALTER TABLE cantieri_assegnazioni ENABLE ROW LEVEL SECURITY;

-- Policy: Admins full access assegnazioni
DROP POLICY IF EXISTS "Admins full access assegnazioni" ON cantieri_assegnazioni;
CREATE POLICY "Admins full access assegnazioni"
    ON cantieri_assegnazioni FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
    );

-- Policy: Operators can read their assignments
DROP POLICY IF EXISTS "Operators can read own assegnazioni" ON cantieri_assegnazioni;
CREATE POLICY "Operators can read own assegnazioni"
    ON cantieri_assegnazioni FOR SELECT
    USING (operatore_id = auth.uid());

-- Commenti sulle tabelle
COMMENT ON TABLE cantieri IS 'Construction sites/projects management';
COMMENT ON TABLE cantiere_tasks IS 'Task checklist for construction sites';
COMMENT ON TABLE cantieri_assegnazioni IS 'Many-to-many relationship between cantieri and operatori';
