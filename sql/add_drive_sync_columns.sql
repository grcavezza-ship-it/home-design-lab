-- Aggiungi colonne per sincronizzazione Google Drive alla tabella projects
-- Esegui questo in Supabase SQL Editor

-- Aggiungi colonna per ID cartella Drive (se non esiste)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'projects' AND column_name = 'drive_folder_id') THEN
        ALTER TABLE projects ADD COLUMN drive_folder_id TEXT;
        CREATE INDEX idx_projects_drive_folder_id ON projects(drive_folder_id);
    END IF;
END $$;

-- Aggiungi colonna per URL cartella Drive (se non esiste)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'projects' AND column_name = 'drive_folder_url') THEN
        ALTER TABLE projects ADD COLUMN drive_folder_url TEXT;
    END IF;
END $$;

-- Aggiungi indice per ricerca rapida
CREATE INDEX IF NOT EXISTS idx_projects_drive_sync ON projects(drive_folder_id, created_by);

COMMENT ON COLUMN projects.drive_folder_id IS 'ID della cartella Google Drive collegata al progetto';
COMMENT ON COLUMN projects.drive_folder_url IS 'URL diretto alla cartella Google Drive';
