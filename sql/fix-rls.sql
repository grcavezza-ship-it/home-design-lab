-- ═══════════════════════════════════════════════════════════════════════════
-- FIX RLS: abilita Row Level Security sulle tabelle che hanno policies
-- ma RLS non attivo
-- DA ESEGUIRE SU Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Abilita RLS su clienti_profiles (ha già le policies)
ALTER TABLE public.clienti_profiles ENABLE ROW LEVEL SECURITY;

-- 2) Abilita RLS su profiles (ha già le policies)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3) Abilita RLS su project_tasks (nessuna policy)
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

-- Policy per project_tasks
CREATE POLICY IF NOT EXISTS "Allow authenticated users to view all tasks"
ON public.project_tasks FOR SELECT
TO authenticated
USING (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated users to insert tasks"
ON public.project_tasks FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated users to update tasks"
ON public.project_tasks FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated users to delete tasks"
ON public.project_tasks FOR DELETE
TO authenticated
USING (true);

-- 4) Verifica finale
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('clienti_profiles', 'profiles', 'project_tasks');
