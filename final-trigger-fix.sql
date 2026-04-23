-- FIX FINALE DEL TRIGGER BASATO SULLA STRUTTURA REALE
-- Esegui questi comandi nell'ordine esatto

-- 1. Rimuovi il trigger esistente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Rimuovi la funzione esistente
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Crea la funzione CORRETTA basata sulla struttura reale
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo se l'utente ha role='operatore' crea profilo operatore
  IF NEW.raw_user_meta_data->>'role' = 'operatore' THEN
    INSERT INTO public.operatori_profiles (id, email, full_name, role, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Nome da definire'),
      'operatore',
      NOW(),
      NOW()
    );
  END IF;
  
  -- Solo se l'utente ha role='cliente' crea profilo cliente
  IF NEW.raw_user_meta_data->>'role' = 'cliente' THEN
    INSERT INTO public.clienti_profiles (id, email, full_name, role, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Nome da definire'),
      'cliente',
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ricrea il trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Verifica che tutto funzioni
SELECT 'Trigger creato con successo' as status;
