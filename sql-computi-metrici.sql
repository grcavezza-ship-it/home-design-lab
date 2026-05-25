-- ═══════════════════════════════════════════════════════════════════════════
-- COMPUTI METRICI E VOCI PER IMPRESA
-- DA ESEGUIRE SU Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Tabella computi metrici caricati
CREATE TABLE IF NOT EXISTS computi_metrici (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cantiere INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  id_impresa UUID NOT NULL REFERENCES imprese(id) ON DELETE CASCADE,
  nome_file TEXT NOT NULL,
  file_url TEXT,
  stato TEXT DEFAULT 'da_analizzare',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE computi_metrici IS 'Computi metrici caricati per cantiere/impresa';
COMMENT ON COLUMN computi_metrici.stato IS 'da_analizzare | analizzato | completato';

-- Tabella voci del computo
CREATE TABLE IF NOT EXISTS voci_computo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_computo UUID NOT NULL REFERENCES computi_metrici(id) ON DELETE CASCADE,
  id_impresa UUID NOT NULL REFERENCES imprese(id) ON DELETE CASCADE,
  id_cantiere INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  numero_voce INTEGER,
  descrizione TEXT NOT NULL,
  importo DECIMAL(12,2) DEFAULT 0,
  categoria TEXT DEFAULT 'Lavori',
  quantita DECIMAL(10,2),
  unita_misura TEXT DEFAULT 'a corpo',
  prezzo_unitario DECIMAL(12,2),
  estratta_automaticamente BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE voci_computo IS 'Voci estratte o inserite manualmente da un computo metrico';
COMMENT ON COLUMN voci_computo.categoria IS 'Lavori | Materiali | Manodopera | Subappalto | Sicurezza | Altro';

-- Indice per ricerca veloce
CREATE INDEX IF NOT EXISTS idx_voci_computo_impresa ON voci_computo(id_impresa);
CREATE INDEX IF NOT EXISTS idx_voci_computo_cantiere ON voci_computo(id_cantiere);
CREATE INDEX IF NOT EXISTS idx_computi_impresa ON computi_metrici(id_impresa);

-- Seed: esempio computo per B&B Schiava su cantiere 14
INSERT INTO computi_metrici (id_cantiere, id_impresa, nome_file, stato, note)
SELECT 14, id, 'Computo_Metrico_BB_Schiava_Zio_Valeria.pdf', 'analizzato', 'Ristrutturazione bagni - computo metrico estimativo'
FROM imprese WHERE email_principale = 'bb-schiava@test.local'
AND NOT EXISTS (SELECT 1 FROM computi_metrici WHERE id_cantiere = 14 AND id_impresa = (SELECT id FROM imprese WHERE email_principale = 'bb-schiava@test.local'));

-- Seed voci computo B&B Schiava
INSERT INTO voci_computo (id_computo, id_impresa, id_cantiere, numero_voce, descrizione, importo, categoria, quantita, unita_misura, prezzo_unitario, estratta_automaticamente)
SELECT
  cm.id, imp.id, cm.id_cantiere, v.*, false
FROM imprese imp, computi_metrici cm
CROSS JOIN (VALUES
  (1, 'Demolizione e rimozione pavimenti e rivestimenti bagno', 3200.00, 'Lavori', 1, 'a corpo', 3200.00),
  (2, 'Rifacimento impermeabilizzazione e sottofondo', 1800.00, 'Lavori', 18, 'mq', 100.00),
  (3, 'Posa pavimento gres porcellanato 60x60', 4200.00, 'Materiali', 42, 'mq', 100.00),
  (4, 'Fornitura e posa rivestimenti ceramici', 2800.00, 'Materiali', 28, 'mq', 100.00),
  (5, 'Sanitari sospesi Geberit + sospensione', 4500.00, 'Materiali', 2, 'cad', 2250.00),
  (6, 'Box doccia cristallo 90x90', 1200.00, 'Materiali', 1, 'cad', 1200.00),
  (7, 'Mobilio bagno: lavabo + mobile sospeso + specchio', 2400.00, 'Materiali', 1, 'a corpo', 2400.00),
  (8, 'Impianto idraulico - nuova distribuzione', 3800.00, 'Manodopera', 1, 'a corpo', 3800.00),
  (9, 'Impianto elettrico bagno - punti luce e prese', 1200.00, 'Manodopera', 6, 'punti', 200.00),
  (10, 'Tinteggiatura e opere di finitura', 1500.00, 'Lavori', 1, 'a corpo', 1500.00),
  (11, 'Smaltimento macerie e pulizia finale', 800.00, 'Altro', 1, 'a corpo', 800.00),
  (12, 'Oneri di sicurezza e coordinamento', 500.00, 'Sicurezza', 1, 'a corpo', 500.00)
) AS v(numero_voce, descrizione, importo, categoria, quantita, unita_misura, prezzo_unitario)
WHERE imp.email_principale = 'bb-schiava@test.local'
AND cm.nome_file = 'Computo_Metrico_BB_Schiava_Zio_Valeria.pdf'
AND NOT EXISTS (SELECT 1 FROM voci_computo vc WHERE vc.id_computo = cm.id AND vc.numero_voce = v.numero_voce);

-- Seed: esempio computo per Impresa Rossi su cantiere 1
INSERT INTO computi_metrici (id_cantiere, id_impresa, nome_file, stato, note)
SELECT 1, id, 'Computo_Metrico_Rossi_Attico_Prisma.pdf', 'analizzato', 'Impiantistica elettrica - computo metrico'
FROM imprese WHERE email_principale = 'impresa-rossi@test.local'
AND NOT EXISTS (SELECT 1 FROM computi_metrici WHERE id_cantiere = 1 AND id_impresa = (SELECT id FROM imprese WHERE email_principale = 'impresa-rossi@test.local'));

INSERT INTO voci_computo (id_computo, id_impresa, id_cantiere, numero_voce, descrizione, importo, categoria, quantita, unita_misura, prezzo_unitario, estratta_automaticamente)
SELECT
  cm.id, imp.id, cm.id_cantiere, v.*, false
FROM imprese imp, computi_metrici cm
CROSS JOIN (VALUES
  (1, 'Quadro elettrico generale - fornitura e posa', 4500.00, 'Materiali', 1, 'cad', 4500.00),
  (2, 'Cavi e canalizzazioni - dorsali principali', 3800.00, 'Lavori', 120, 'ml', 31.67),
  (3, 'Punti luce interni con installazione', 6400.00, 'Manodopera', 32, 'punti', 200.00),
  (4, 'Punti prese elettriche', 4800.00, 'Manodopera', 48, 'punti', 100.00),
  (5, 'Linee dedicate climatizzazione', 2200.00, 'Lavori', 4, 'linee', 550.00),
  (6, 'Impianto citofonico/videocitofono', 950.00, 'Materiali', 1, 'a corpo', 950.00),
  (7, 'Collaudi e certificazioni impianto', 1800.00, 'Sicurezza', 1, 'a corpo', 1800.00)
) AS v(numero_voce, descrizione, importo, categoria, quantita, unita_misura, prezzo_unitario)
WHERE imp.email_principale = 'impresa-rossi@test.local'
AND cm.nome_file = 'Computo_Metrico_Rossi_Attico_Prisma.pdf'
AND NOT EXISTS (SELECT 1 FROM voci_computo vc WHERE vc.id_computo = cm.id AND vc.numero_voce = v.numero_voce);

-- Aggiorna economia esistenti con totali computi
UPDATE cantiere_impresa_economia cie
SET importo_contratto = sub.totale
FROM (
  SELECT vc.id_impresa, vc.id_cantiere, SUM(vc.importo) as totale
  FROM voci_computo vc
  GROUP BY vc.id_impresa, vc.id_cantiere
) sub
WHERE cie.id_impresa = sub.id_impresa AND cie.id_cantiere = sub.id_cantiere
AND cie.importo_contratto = 0;
