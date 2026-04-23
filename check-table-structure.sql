-- VERIFICA STRUTTURA TABELLA operatori_profiles
-- Esegui questo comando per vedere le colonne esistenti

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'operatori_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;
