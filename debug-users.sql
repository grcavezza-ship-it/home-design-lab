-- DEBUG COMPLETO PER GESTIONE UTENTI
-- Esegui questi comandi per verificare lo stato attuale

-- 1. VERIFICA SE IL TRIGGER ESISTE
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgfoid::regproc as function_name,
    tgtype as trigger_type
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 2. VERIFICA SE LA FUNZIONE ESISTE
SELECT 
    proname as function_name,
    prosrc as source_code
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 3. VERIFICA CONTENUTO TABELLA operatori_profiles
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'operatori_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. VERIFICA DATI IN operatori_profiles
SELECT 
    id,
    email,
    nome,
    ruolo,
    telefono,
    is_active,
    created_at,
    updated_at
FROM operatori_profiles 
ORDER BY created_at DESC;

-- 5. VERIFICA UTENTI IN auth.users
SELECT 
    id,
    email,
    created_at,
    raw_user_meta_data
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 6. VERIFICA SE CI SONO ERRORI NEI LOG
SELECT 
    *
FROM operatori_profiles 
WHERE nome IS NULL OR ruolo IS NULL;
