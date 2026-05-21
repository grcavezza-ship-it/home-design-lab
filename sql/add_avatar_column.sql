-- =============================================================================
-- MIGRAZIONE: Aggiunta colonna avatar_url alla tabella profiles
-- 
-- Descrizione: Aggiunge supporto per avatar utenti personalizzati
-- - Staff (senior/operator): avatar_url reale (foto profilo)
-- - Clienti: avatar generato automaticamente (DiceBear)
-- 
-- Data: 2024-05-04
-- =============================================================================

-- Aggiungi colonna avatar_url se non esiste
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Aggiungi commento per documentazione
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL avatar utente. Per staff: foto reale. Per clienti: NULL (generato automaticamente via DiceBear API)';

-- Crea indice per ricerche rapide (opzionale, utile se si filtra per avatar)
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url ON public.profiles(avatar_url) 
WHERE avatar_url IS NOT NULL;

-- Aggiorna RLS policies per permettere agli utenti di aggiornare solo il proprio avatar
-- (Assumendo che la tabella abbia già RLS abilitato)

-- Policy: utenti possono aggiornare il proprio avatar
DROP POLICY IF EXISTS "Users can update own avatar" ON public.profiles;

CREATE POLICY "Users can update own avatar" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy: staff può aggiornare avatar di tutti (per gestione admin)
DROP POLICY IF EXISTS "Staff can update any avatar" ON public.profiles;

CREATE POLICY "Staff can update any avatar" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('senior', 'admin')
        )
    );

-- =============================================================================
-- ESEMPIO: Query per aggiornare avatar (eseguire dopo la migrazione)
-- =============================================================================

-- Aggiornare avatar proprio (come utente):
-- UPDATE profiles SET avatar_url = 'https://example.com/mia-foto.jpg' WHERE id = auth.uid();

-- Aggiornare avatar staff (come admin):
-- UPDATE profiles SET avatar_url = 'https://example.com/foto-staff.jpg' 
-- WHERE id = 'uuid-del-utente' AND role IN ('senior', 'operator');

-- Verifica migrazione:
-- SELECT id, email, role, avatar_url FROM profiles LIMIT 5;

-- =============================================================================
-- ROLLBACK (in caso di necessità):
-- =============================================================================
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS avatar_url;
-- DROP INDEX IF EXISTS idx_profiles_avatar_url;
-- DROP POLICY IF EXISTS "Users can update own avatar" ON public.profiles;
-- DROP POLICY IF EXISTS "Staff can update any avatar" ON public.profiles;
-- =============================================================================
