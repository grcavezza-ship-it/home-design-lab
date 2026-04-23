-- PARTE 1: Disabilita RLS policies
ALTER TABLE operatori_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE clienti_profiles DISABLE ROW LEVEL SECURITY;

-- PARTE 2: Rimuovi trigger problematici
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_clienti ON auth.users;

-- PARTE 3: Rimuovi funzione trigger esistente
DROP FUNCTION IF EXISTS public.handle_new_user();

-- PARTE 4: Crea trigger semplificato
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo se l'utente ha role='operatore' crea profilo operatore
  IF NEW.raw_user_meta_data->>'role' = 'operatore' THEN
    INSERT INTO public.operatori_profiles (id, email, nome, ruolo, telefono, is_active, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Nome da definire'),
      'operatore',
      '',
      true,
      NOW(),
      NOW()
    );
  END IF;
  
  -- Solo se l'utente ha role='cliente' crea profilo cliente
  IF NEW.raw_user_meta_data->>'role' = 'cliente' THEN
    INSERT INTO public.clienti_profiles (id, email, nome, ruolo, telefono, is_active, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Nome da definire'),
      'cliente',
      '',
      true,
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PARTE 5: Crea il trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PARTE 6: Verifica le tabelle
SELECT 'operatori_profiles' as table_name, COUNT(*) as count FROM operatori_profiles
UNION ALL
SELECT 'clienti_profiles' as table_name, COUNT(*) as count FROM clienti_profiles;
