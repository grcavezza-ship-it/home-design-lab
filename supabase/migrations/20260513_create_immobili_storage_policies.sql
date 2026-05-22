-- Bucket immobili: policy per storage
-- Il bucket è già stato creato via REST API. Ora servono policy e permessi.

-- Policy: chiunque può leggere le immagini degli immobili (profilo pubblico)
CREATE POLICY "Anyone can view immobili images" ON storage.objects
    FOR SELECT USING (bucket_id = 'immobili');

-- Policy: utenti autenticati possono caricare immagini (basato su bucket_id)
CREATE POLICY "Authenticated can upload immobili images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'immobili' AND
        auth.role() = 'authenticated'
    );

-- Policy: proprietari possono caricare immagini (basato su owner = auth.uid())
CREATE POLICY "Owners can insert immobili images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'immobili' AND
        owner = auth.uid()
    );

-- Policy: proprietari possono aggiornare
CREATE POLICY "Authenticated can update immobili images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'immobili' AND
        auth.role() = 'authenticated'
    );

-- Policy: proprietari possono eliminare
CREATE POLICY "Authenticated can delete immobili images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'immobili' AND
        auth.role() = 'authenticated'
    );
