-- Migrazione SQL Minimale per Supabase
-- Esegui un comando alla volta

-- Creazione tabella projects
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    titolo VARCHAR(255) NOT NULL,
    descrizione TEXT,
    categoria VARCHAR(100) DEFAULT 'residenziale',
    immagini JSONB DEFAULT '[]',
    data DATE DEFAULT CURRENT_DATE,
    dettagli JSONB DEFAULT '{}',
    stato VARCHAR(50) DEFAULT 'attivo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Creazione tabella properties
CREATE TABLE IF NOT EXISTS properties (
    id SERIAL PRIMARY KEY,
    titolo VARCHAR(255) NOT NULL,
    descrizione TEXT,
    prezzo VARCHAR(50),
    localita VARCHAR(255),
    superficie VARCHAR(50),
    camere INTEGER,
    immagini JSONB DEFAULT '[]',
    stato VARCHAR(50) DEFAULT 'disponibile',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Creazione tabella articles
CREATE TABLE IF NOT EXISTS articles (
    id SERIAL PRIMARY KEY,
    titolo VARCHAR(255) NOT NULL,
    descrizione TEXT,
    contenuto TEXT,
    data DATE DEFAULT CURRENT_DATE,
    categoria VARCHAR(100) DEFAULT 'design',
    tags JSONB DEFAULT '[]',
    stato VARCHAR(50) DEFAULT 'pubblicato',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserimento dati projects
INSERT INTO projects (titolo, descrizione, categoria, immagini, data, dettagli) VALUES
('Attico Prisma', 'Progetto di ristrutturazione completa di un attico con vista panoramica. Design moderno con materiali sostenibili e massima illuminazione naturale.', 'residenziale', '["attico1.jpg", "attico2.jpg"]', '2024-01-15', '{"superficie": "180mq", "localita": "Milano", "durata": "6 mesi", "budget": "150.000"}')
ON CONFLICT DO NOTHING;

INSERT INTO projects (titolo, descrizione, categoria, immagini, data, dettagli) VALUES
('Villa Orizzonte', 'Nuova costruzione villa moderna con giardino paesaggistico. Architettura integrata con il paesaggio circostante.', 'residenziale', '["villa1.jpg", "villa2.jpg"]', '2024-02-20', '{"superficie": "320mq", "localita": "Como", "durata": "12 mesi", "budget": "450.000"}')
ON CONFLICT DO NOTHING;

-- Inserimento dati properties
INSERT INTO properties (titolo, descrizione, prezzo, localita, superficie, camere, immagini) VALUES
('Villa Orizzonte', 'Esclusiva villa moderna con piscina infinity', '850.000', 'Como', '320', 4, '["villa1.jpg", "villa2.jpg"]')
ON CONFLICT DO NOTHING;

-- Inserimento dati articles
INSERT INTO articles (titolo, descrizione, contenuto, data, categoria) VALUES
('Tendenze architettura 2024', 'Le nuove tendenze nel design architettonico per il nuovo anno', 'Articolo completo sulle tendenze dell''architettura moderna per il 2024, con focus su sostenibilità, materiali innovativi e design biophilic.', '2024-03-10', 'design')
ON CONFLICT DO NOTHING;

-- Creazione indici
CREATE INDEX IF NOT EXISTS idx_projects_categoria ON projects(categoria);
CREATE INDEX IF NOT EXISTS idx_projects_stato ON projects(stato);
CREATE INDEX IF NOT EXISTS idx_properties_stato ON properties(stato);
CREATE INDEX IF NOT EXISTS idx_properties_localita ON properties(localita);
CREATE INDEX IF NOT EXISTS idx_articles_categoria ON articles(categoria);
CREATE INDEX IF NOT EXISTS idx_articles_stato ON articles(stato);

-- Abilitazione Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Creazione policy
CREATE POLICY "Public read access for projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Public read access for properties" ON properties FOR SELECT USING (true);
CREATE POLICY "Public read access for articles" ON articles FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage projects" ON projects FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage properties" ON properties FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage articles" ON articles FOR ALL USING (auth.role() = 'authenticated');

-- Creazione trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
