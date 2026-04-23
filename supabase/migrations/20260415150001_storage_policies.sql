-- Home Design Lab - Supabase Storage Policies
-- Migration per configurare storage buckets e policies

-- NOTA: Questi comandi devono essere eseguiti via Supabase Dashboard SQL Editor
-- o tramite API Supabase, non direttamente come migration SQL standard

-- 1. Creazione Storage Buckets (eseguire via Dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('project-documents', 'project-documents', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('user-avatars', 'user-avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('project-images', 'project-images', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('temp-uploads', 'temp-uploads', false);

-- 2. Policies per Project Documents Bucket
-- Gli utenti possono caricare file solo nei propri progetti
CREATE POLICY "Users can upload to own projects" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'project-documents' AND
    auth.role() = 'authenticated' AND
    (
        -- Se il file è per un progetto dell'utente
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = (storage.foldername(name))[1]::UUID
            AND (p.client_id = auth.uid() OR p.created_by = auth.uid())
        ) OR
        -- Se l'utente ha permessi sul progetto
        EXISTS (
            SELECT 1 FROM public.project_permissions pp
            WHERE pp.project_id = (storage.foldername(name))[1]::UUID
            AND pp.user_id = auth.uid()
            AND pp.permission_level IN ('write', 'admin', 'owner')
        )
    )
);

-- Gli utenti possono vedere file dei propri progetti o file pubblici
CREATE POLICY "Users can view project documents" ON storage.objects
FOR SELECT USING (
    bucket_id = 'project-documents' AND
    (
        -- File pubblici
        (storage.foldername(name))[2] = 'public' OR
        -- Utente proprietario progetto
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = (storage.foldername(name))[1]::UUID
            AND (p.client_id = auth.uid() OR p.created_by = auth.uid())
        ) OR
        -- Utente con permessi
        EXISTS (
            SELECT 1 FROM public.project_permissions pp
            WHERE pp.project_id = (storage.foldername(name))[1]::UUID
            AND pp.user_id = auth.uid()
            AND pp.permission_level IN ('read', 'write', 'admin', 'owner')
        )
    )
);

-- Gli utenti possono aggiornare solo file propri o con permessi
CREATE POLICY "Users can update project documents" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'project-documents' AND
    (
        -- Utente proprietario progetto
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = (storage.foldername(name))[1]::UUID
            AND (p.client_id = auth.uid() OR p.created_by = auth.uid())
        ) OR
        -- Utente con permessi
        EXISTS (
            SELECT 1 FROM public.project_permissions pp
            WHERE pp.project_id = (storage.foldername(name))[1]::UUID
            AND pp.user_id = auth.uid()
            AND pp.permission_level IN ('write', 'admin', 'owner')
        )
    )
);

-- Gli utenti possono eliminare solo file propri o con permessi
CREATE POLICY "Users can delete project documents" ON storage.objects
FOR DELETE USING (
    bucket_id = 'project-documents' AND
    (
        -- Utente proprietario progetto
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = (storage.foldername(name))[1]::UUID
            AND (p.client_id = auth.uid() OR p.created_by = auth.uid())
        ) OR
        -- Utente con permessi
        EXISTS (
            SELECT 1 FROM public.project_permissions pp
            WHERE pp.project_id = (storage.foldername(name))[1]::UUID
            AND pp.user_id = auth.uid()
            AND pp.permission_level IN ('admin', 'owner')
        )
    )
);

-- 3. Policies per User Avatars Bucket
CREATE POLICY "Users can upload own avatar" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'user-avatars' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1]::TEXT = auth.uid()::TEXT
);

CREATE POLICY "Users can view all avatars" ON storage.objects
FOR SELECT USING (
    bucket_id = 'user-avatars' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "Users can update own avatar" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'user-avatars' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1]::TEXT = auth.uid()::TEXT
);

CREATE POLICY "Users can delete own avatar" ON storage.objects
FOR DELETE USING (
    bucket_id = 'user-avatars' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1]::TEXT = auth.uid()::TEXT
);

-- 4. Policies per Project Images Bucket
CREATE POLICY "Users can upload project images" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'project-images' AND
    auth.role() = 'authenticated' AND
    (
        -- Utente proprietario progetto
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = (storage.foldername(name))[1]::UUID
            AND (p.client_id = auth.uid() OR p.created_by = auth.uid())
        ) OR
        -- Utente con permessi
        EXISTS (
            SELECT 1 FROM public.project_permissions pp
            WHERE pp.project_id = (storage.foldername(name))[1]::UUID
            AND pp.user_id = auth.uid()
            AND pp.permission_level IN ('write', 'admin', 'owner')
        )
    )
);

CREATE POLICY "Users can view project images" ON storage.objects
FOR SELECT USING (
    bucket_id = 'project-images' AND
    (
        -- Utente proprietario progetto
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = (storage.foldername(name))[1]::UUID
            AND (p.client_id = auth.uid() OR p.created_by = auth.uid())
        ) OR
        -- Utente con permessi
        EXISTS (
            SELECT 1 FROM public.project_permissions pp
            WHERE pp.project_id = (storage.foldername(name))[1]::UUID
            AND pp.user_id = auth.uid()
            AND pp.permission_level IN ('read', 'write', 'admin', 'owner')
        )
    )
);

-- 5. Policies per Temp Uploads Bucket
CREATE POLICY "Authenticated users can upload temp files" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'temp-uploads' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1]::TEXT = auth.uid()::TEXT
);

CREATE POLICY "Users can view own temp files" ON storage.objects
FOR SELECT USING (
    bucket_id = 'temp-uploads' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1]::TEXT = auth.uid()::TEXT
);

CREATE POLICY "Users can update own temp files" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'temp-uploads' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1]::TEXT = auth.uid()::TEXT
);

CREATE POLICY "Users can delete own temp files" ON storage.objects
FOR DELETE USING (
    bucket_id = 'temp-uploads' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1]::TEXT = auth.uid()::TEXT
);

-- 6. Funzioni helper per storage
CREATE OR REPLACE FUNCTION storage.foldername(path TEXT)
RETURNS TEXT[] AS $$
BEGIN
    RETURN string_to_array(path, '/');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 7. Trigger per log attività upload file
CREATE OR REPLACE FUNCTION public.log_file_upload()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.activities (project_id, user_id, activity_type, description, metadata)
    VALUES (
        (storage.foldername(NEW.name))[1]::UUID,
        auth.uid(),
        'document_uploaded',
        'File caricato: ' || (storage.foldername(NEW.name))[2],
        jsonb_build_object(
            'file_name', (storage.foldername(NEW.name))[2],
            'file_size', NEW.size,
            'mime_type', NEW.metadata->>'mimeType'
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger per log upload (da applicare ai buckets necessari)
-- CREATE TRIGGER on_file_upload AFTER INSERT ON storage.objects
-- FOR EACH ROW WHEN (NEW.bucket_id = 'project-documents')
-- EXECUTE FUNCTION public.log_file_upload();

-- 8. Funzione per pulizia temp uploads vecchi
CREATE OR REPLACE FUNCTION public.cleanup_temp_uploads()
RETURNS void AS $$
BEGIN
    DELETE FROM storage.objects 
    WHERE bucket_id = 'temp-uploads' 
    AND created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. View per statistiche storage
CREATE OR REPLACE VIEW public.storage_stats AS
SELECT 
    bucket_id,
    COUNT(*) as file_count,
    SUM(size) as total_size,
    MIN(created_at) as oldest_file,
    MAX(created_at) as newest_file
FROM storage.objects 
GROUP BY bucket_id;

-- Commenti
COMMENT ON TABLE storage.objects IS 'Storage objects con policies di sicurezza per Home Design Lab';
COMMENT ON POLICY "Users can upload to own projects" ON storage.objects IS 'Permette upload solo nei propri progetti';
COMMENT ON POLICY "Users can view project documents" ON storage.objects IS 'Permette visualizzazione file propri e pubblici';
COMMENT ON FUNCTION storage.foldername IS 'Helper per estrarre folder path dai nomi file';
COMMENT ON FUNCTION public.cleanup_temp_uploads IS 'Pulisce file temporanei più vecchi di 24 ore';
