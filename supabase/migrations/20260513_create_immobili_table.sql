-- Tabella IMMOBILI per il frontend creazione-immobile.html
-- Colonna in italiano come atteso da gestione-immobili.html

CREATE TABLE IF NOT EXISTS immobili (
    id SERIAL PRIMARY KEY,
    titolo VARCHAR(255) NOT NULL,
    descrizione TEXT,
    tipologia VARCHAR(100),
    superficie VARCHAR(50),
    citta VARCHAR(255),
    stato_immobile VARCHAR(50) DEFAULT 'Disponibile',
    prezzo_richiesta NUMERIC(14,2),
    immagini JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE immobili ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tutti possono leggere immobili" ON immobili;
CREATE POLICY "Tutti possono leggere immobili"
    ON immobili FOR SELECT USING (true);

DROP POLICY IF EXISTS "Utenti autenticati gestiscono immobili" ON immobili;
CREATE POLICY "Utenti autenticati gestiscono immobili"
    ON immobili FOR ALL USING (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION update_immobili_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS immobili_set_updated_at ON immobili;
CREATE TRIGGER immobili_set_updated_at
    BEFORE UPDATE ON immobili
    FOR EACH ROW EXECUTE FUNCTION update_immobili_updated_at();
