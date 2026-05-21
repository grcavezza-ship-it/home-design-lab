-- Migration: Creazione tabella project_tasks per Copilota di Cantiere AI
-- Created: 2024-05-04

-- Tabella task progetti
CREATE TABLE IF NOT EXISTS project_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    titolo TEXT NOT NULL,
    fase_lavorativa TEXT NOT NULL DEFAULT 'Cantiere',
    completato BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_fase ON project_tasks(fase_lavorativa);
CREATE INDEX IF NOT EXISTS idx_project_tasks_completato ON project_tasks(completato);

-- Commenti tabella e colonne
COMMENT ON TABLE project_tasks IS 'Task individuali associati ai progetti, generabili anche tramite AI';
COMMENT ON COLUMN project_tasks.project_id IS 'Riferimento al progetto padre';
COMMENT ON COLUMN project_tasks.titolo IS 'Descrizione del task da eseguire';
COMMENT ON COLUMN project_tasks.fase_lavorativa IS 'Fase del lavoro: Rilievo, Progettazione, Sicurezza, Cantiere';
COMMENT ON COLUMN project_tasks.completato IS 'Stato di completamento del task';

-- Trigger per aggiornamento automatico updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_project_tasks_updated_at ON project_tasks;
CREATE TRIGGER update_project_tasks_updated_at
    BEFORE UPDATE ON project_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Abilita Row Level Security (RLS)
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;

-- Policy: utenti autenticati possono vedere tutti i task
CREATE POLICY "Allow authenticated users to view all tasks" 
ON project_tasks FOR SELECT 
TO authenticated 
USING (true);

-- Policy: utenti autenticati possono inserire task
CREATE POLICY "Allow authenticated users to insert tasks" 
ON project_tasks FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Policy: utenti autenticati possono aggiornare task
CREATE POLICY "Allow authenticated users to update tasks" 
ON project_tasks FOR UPDATE 
TO authenticated 
USING (true);

-- Policy: utenti autenticati possono cancellare task
CREATE POLICY "Allow authenticated users to delete tasks" 
ON project_tasks FOR DELETE 
TO authenticated 
USING (true);
