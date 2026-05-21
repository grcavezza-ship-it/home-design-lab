-- Migration: Espansione tabella projects per dettaglio-progetto.html
-- Data: 2026-05-04

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS descrizione TEXT,
ADD COLUMN IF NOT EXISTS cliente TEXT,
ADD COLUMN IF NOT EXISTS data_inizio DATE,
ADD COLUMN IF NOT EXISTS data_consegna DATE,
ADD COLUMN IF NOT EXISTS budget NUMERIC,
ADD COLUMN IF NOT EXISTS avanzamento INTEGER DEFAULT 0;

-- Aggiungi indici per performance
CREATE INDEX IF NOT EXISTS idx_projects_cliente ON projects(cliente);
CREATE INDEX IF NOT EXISTS idx_projects_data_inizio ON projects(data_inizio);

COMMENT ON COLUMN projects.descrizione IS 'Descrizione dettagliata del progetto';
COMMENT ON COLUMN projects.cliente IS 'Nome del cliente committente';
COMMENT ON COLUMN projects.data_inizio IS 'Data di inizio progetto';
COMMENT ON COLUMN projects.data_consegna IS 'Data prevista di consegna';
COMMENT ON COLUMN projects.budget IS 'Budget approvato per il progetto (€)';
COMMENT ON COLUMN projects.avanzamento IS 'Percentuale di completamento (0-100)';
