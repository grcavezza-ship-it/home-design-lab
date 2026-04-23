-- Migrazione: Separazione Tabelle Operatori e Clienti
-- Esegui in Supabase SQL Editor: https://supabase.com/dashboard/project/amhqqszzxmrphisxlsnj/sql

-- ========================================
-- 1. CREAZIONE NUOVE TABELLE SEPARATE
-- ========================================

-- Tabella Operatori (Admin + Architetti)
CREATE TABLE IF NOT EXISTS operatori_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'architect')),
    is_active BOOLEAN DEFAULT true,
    telefono TEXT,
    specializzazione TEXT, -- es: "Residenziale", "Commerciale", "Restauro"
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabella Clienti
CREATE TABLE IF NOT EXISTS clienti_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    telefono TEXT,
    indirizzo TEXT,
    citta TEXT,
    provincia TEXT,
    cap TEXT,
    tipo_cliente TEXT CHECK (tipo_cliente IN ('privato', 'azienda')),
    partita_iva TEXT, -- solo per aziende
    codice_fiscale TEXT,
    budget_range TEXT, -- es: "50k-100k", "100k-250k", "250k+"
    preferenze_contatto TEXT[], -- es: ['email', 'telefono', 'whatsapp']
    note_interne TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ========================================
-- 2. MIGRAZIONE DATI DA PROFILES ESISTENTE
-- ========================================

-- Migrare operatori (admin + architect)
INSERT INTO operatori_profiles (user_id, email, full_name, role, is_active, telefono, bio, avatar_url, created_at, updated_at)
SELECT 
    user_id,
    email,
    full_name,
    role,
    is_active,
    telefono,
    bio,
    avatar_url,
    created_at,
    updated_at
FROM profiles
WHERE role IN ('admin', 'architect')
ON CONFLICT (user_id) DO NOTHING;

-- Migrare clienti
INSERT INTO clienti_profiles (user_id, email, full_name, is_active, telefono, indirizzo, citta, provincia, cap, created_at, updated_at)
SELECT 
    user_id,
    email,
    full_name,
    is_active,
    telefono,
    indirizzo,
    citta,
    provincia,
    cap,
    created_at,
    updated_at
FROM profiles
WHERE role = 'client'
ON CONFLICT (user_id) DO NOTHING;

-- ========================================
-- 3. AGGIORNAMENTO TABELLE CORRELATE
-- ========================================

-- Aggiornare projects per usare operatori_profiles
ALTER TABLE projects 
DROP CONSTRAINT IF EXISTS projects_client_id_fkey,
DROP CONSTRAINT IF EXISTS projects_architect_id_fkey;

-- Aggiungere nuovi foreign keys verso operatori_profiles
ALTER TABLE projects 
ADD CONSTRAINT projects_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES clienti_profiles(id) ON DELETE SET NULL,
ADD CONSTRAINT projects_architect_id_fkey 
FOREIGN KEY (architect_id) REFERENCES operatori_profiles(id) ON DELETE SET NULL;

-- Aggiornare altre tabelle che referenziano profiles
ALTER TABLE folders 
DROP CONSTRAINT IF EXISTS folders_owner_id_fkey,
ADD CONSTRAINT folders_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES operatori_profiles(id) ON DELETE CASCADE;

ALTER TABLE documents 
DROP CONSTRAINT IF EXISTS documents_owner_id_fkey,
ADD CONSTRAINT documents_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES operatori_profiles(id) ON DELETE CASCADE;

ALTER TABLE messages 
DROP CONSTRAINT IF EXISTS messages_sender_id_fkey,
DROP CONSTRAINT IF EXISTS messages_recipient_id_fkey,
ADD CONSTRAINT messages_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES operatori_profiles(id) ON DELETE CASCADE,
ADD CONSTRAINT messages_recipient_id_fkey 
FOREIGN KEY (recipient_id) REFERENCES operatori_profiles(id) ON DELETE CASCADE;

ALTER TABLE activities 
DROP CONSTRAINT IF EXISTS activities_user_id_fkey,
ADD CONSTRAINT activities_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES operatori_profiles(id) ON DELETE CASCADE;

ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey,
ADD CONSTRAINT tasks_assigned_to_fkey 
FOREIGN KEY (assigned_to) REFERENCES operatori_profiles(id) ON DELETE CASCADE;

ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_user_id_fkey,
ADD CONSTRAINT notifications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES operatori_profiles(id) ON DELETE CASCADE;

-- ========================================
-- 4. INDICI PER NUOVE TABELLE
-- ========================================

-- Indici per operatori_profiles
CREATE INDEX IF NOT EXISTS idx_operatori_profiles_user_id ON operatori_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_operatori_profiles_email ON operatori_profiles(email);
CREATE INDEX IF NOT EXISTS idx_operatori_profiles_role ON operatori_profiles(role);
CREATE INDEX IF NOT EXISTS idx_operatori_profiles_is_active ON operatori_profiles(is_active);

-- Indici per clienti_profiles
CREATE INDEX IF NOT EXISTS idx_clienti_profiles_user_id ON clienti_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_clienti_profiles_email ON clienti_profiles(email);
CREATE INDEX IF NOT EXISTS idx_clienti_profiles_is_active ON clienti_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_clienti_profiles_citta ON clienti_profiles(citta);
CREATE INDEX IF NOT EXISTS idx_clienti_profiles_tipo_cliente ON clienti_profiles(tipo_cliente);

-- ========================================
-- 5. TRIGGER PER NUOVE TABELLE
-- ========================================

-- Trigger per operatori_profiles
CREATE OR REPLACE FUNCTION update_operatori_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER operatori_profiles_updated_at
    BEFORE UPDATE ON operatori_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_operatori_profiles_updated_at();

-- Trigger per clienti_profiles
CREATE OR REPLACE FUNCTION update_clienti_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clienti_profiles_updated_at
    BEFORE UPDATE ON clienti_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_clienti_profiles_updated_at();

-- ========================================
-- 6. RLS POLICIES PER NUOVE TABELLE
-- ========================================

-- Abilitare RLS
ALTER TABLE operatori_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clienti_profiles ENABLE ROW LEVEL SECURITY;

-- Policies per operatori_profiles
CREATE POLICY "Operators can view all operator profiles" ON operatori_profiles
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Operators can insert operator profiles" ON operatori_profiles
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Operators can update operator profiles" ON operatori_profiles
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Operators can delete operator profiles" ON operatori_profiles
FOR DELETE USING (auth.role() = 'authenticated');

-- Policies per clienti_profiles
CREATE POLICY "Operators can view all client profiles" ON clienti_profiles
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Operators can insert client profiles" ON clienti_profiles
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Operators can update client profiles" ON clienti_profiles
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Operators can delete client profiles" ON clienti_profiles
FOR DELETE USING (auth.role() = 'authenticated');

-- ========================================
-- 7. VISTE UNIFICATE PER COMPATIBILITÀ
-- ========================================

-- Vista unificata profiles per mantenere compatibilità
CREATE OR REPLACE VIEW profiles AS
SELECT 
    id,
    user_id,
    email,
    full_name,
    role,
    is_active,
    telefono,
    indirizzo,
    citta,
    provincia,
    cap,
    bio,
    avatar_url,
    created_at,
    updated_at
FROM operatori_profiles

UNION ALL

SELECT 
    id,
    user_id,
    email,
    full_name,
    'client' as role,
    is_active,
    telefono,
    indirizzo,
    citta,
    provincia,
    cap,
    bio,
    avatar_url,
    created_at,
    updated_at
FROM clienti_profiles;

-- ========================================
-- 8. FUNZIONI PER GESTIONE UTENTI
-- ========================================

-- Funzione per creare operatore
CREATE OR REPLACE FUNCTION create_operatore(
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT,
    p_role TEXT DEFAULT 'architect',
    p_telefono TEXT DEFAULT NULL,
    p_specializzazione TEXT DEFAULT NULL,
    p_bio TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
    new_operatore_id UUID;
BEGIN
    -- Creare utente in auth.users
    INSERT INTO auth.users (
        email,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_user_meta_data
    ) VALUES (
        p_email,
        now(),
        now(),
        now(),
        json_build_object('full_name', p_full_name, 'role', p_role)
    ) RETURNING id INTO new_user_id;
    
    -- Creare profilo operatore
    INSERT INTO operatori_profiles (
        user_id,
        email,
        full_name,
        role,
        is_active,
        telefono,
        specializzazione,
        bio
    ) VALUES (
        new_user_id,
        p_email,
        p_full_name,
        p_role,
        true,
        p_telefono,
        p_specializzazione,
        p_bio
    ) RETURNING id INTO new_operatore_id;
    
    -- Impostare password (solo admin può fare questo)
    -- Nota: La password deve essere impostata tramite admin panel
    
    RETURN new_operatore_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per creare cliente
CREATE OR REPLACE FUNCTION create_cliente(
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT,
    p_telefono TEXT DEFAULT NULL,
    p_indirizzo TEXT DEFAULT NULL,
    p_citta TEXT DEFAULT NULL,
    p_provincia TEXT DEFAULT NULL,
    p_cap TEXT DEFAULT NULL,
    p_tipo_cliente TEXT DEFAULT 'privato',
    p_partita_iva TEXT DEFAULT NULL,
    p_codice_fiscale TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
    new_cliente_id UUID;
BEGIN
    -- Creare utente in auth.users
    INSERT INTO auth.users (
        email,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_user_meta_data
    ) VALUES (
        p_email,
        now(),
        now(),
        now(),
        json_build_object('full_name', p_full_name, 'role', 'client')
    ) RETURNING id INTO new_user_id;
    
    -- Creare profilo cliente
    INSERT INTO clienti_profiles (
        user_id,
        email,
        full_name,
        is_active,
        telefono,
        indirizzo,
        citta,
        provincia,
        cap,
        tipo_cliente,
        partita_iva,
        codice_fiscale
    ) VALUES (
        new_user_id,
        p_email,
        p_full_name,
        true,
        p_telefono,
        p_indirizzo,
        p_citta,
        p_provincia,
        p_cap,
        p_tipo_cliente,
        p_partita_iva,
        p_codice_fiscale
    ) RETURNING id INTO new_cliente_id;
    
    RETURN new_cliente_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 9. COMPLETION MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'Migrazione completata con successo!';
    RAISE NOTICE 'Tabelle create: operatori_profiles, clienti_profiles';
    RAISE NOTICE 'Dati migrati dalla tabella profiles originale';
    RAISE NOTICE 'Foreign keys aggiornati';
    RAISE NOTICE 'Indici, trigger e RLS policies configurate';
    RAISE NOTICE 'Vista profiles mantenuta per compatibilità';
    RAISE NOTICE 'Funzioni per creazione utenti disponibili';
END $$;
