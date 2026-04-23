-- EMERGENCY FIX PER PROBLEMI SUPABASE
-- Eseguire questi comandi sulla Supabase Dashboard SQL Editor

-- 1. DISABILITA TEMPORANEAMENTE LE RLS POLICIES
ALTER TABLE operatori_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE clienti_profiles DISABLE ROW LEVEL SECURITY;

-- 2. RIMUOVI I TRIGGER PROBLEMATICI
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_clienti ON auth.users;

-- 3. VERIFICA LE TABELLE
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('operatori_profiles', 'clienti_profiles');

-- 4. VERIFICA I TRIGGER
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- 5. CREA UN TRIGGER SEMPLIFICATO
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo se l'utente ha role='operatore' crea profilo operatore
  IF NEW.raw_user_meta_data->>'role' = 'operatore' THEN
    INSERT INTO public.operatori_profiles (id, email, full_name, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Nome da definire'),
      'operatore'
    );
  END IF;
  
  -- Solo se l'utente ha role='cliente' crea profilo cliente
  IF NEW.raw_user_meta_data->>'role' = 'cliente' THEN
    INSERT INTO public.clienti_profiles (id, email, full_name, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Nome da definire'),
      'cliente'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. CREA IL TRIGGER
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. ABILITA DI NUOVO LE RLS POLICIES (se necessario)
-- ALTER TABLE operatori_profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE clienti_profiles ENABLE ROW LEVEL SECURITY;

-- 8. TEST: VERIFICA SE TUTTO FUNZIONA
SELECT 'operatori_profiles' as table_name, COUNT(*) as count FROM operatori_profiles
UNION ALL
SELECT 'clienti_profiles' as table_name, COUNT(*) as count FROM clienti_profiles;
