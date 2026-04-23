-- Storage Setup for Home Design Lab
-- Execute this in Supabase SQL Editor: https://supabase.com/dashboard/project/amhqqszzxmrphisxlsnj/sql

-- ========================================
-- 1. CREATE STORAGE BUCKETS
-- ========================================

-- Create buckets for different file types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES 
    ('project-documents', 'project-documents', false, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png', 'image/gif', 'text/plain']),
    ('user-avatars', 'user-avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
    ('project-images', 'project-images', true, 104857600, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']),
    ('temp-uploads', 'temp-uploads', false, 104857600, ARRAY['*'])
ON CONFLICT (id) DO UPDATE SET 
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ========================================
-- 2. STORAGE POLICIES
-- ========================================

-- Project Documents Bucket Policies
CREATE POLICY "Users can view their project documents" ON storage.objects
FOR SELECT USING (
    bucket_id = 'project-documents' AND (
        auth.uid()::text = (storage.foldername(name))[1] OR
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id::text = (storage.foldername(name))[1]
            AND (p.client_id = auth.uid() OR p.architect_id = auth.uid())
        )
    )
);

CREATE POLICY "Users can upload to their project documents" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'project-documents' AND (
        auth.uid()::text = (storage.foldername(name))[1] OR
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id::text = (storage.foldername(name))[1]
            AND (p.architect_id = auth.uid() OR p.client_id = auth.uid())
        )
    )
);

CREATE POLICY "Users can update their project documents" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'project-documents' AND (
        auth.uid()::text = (storage.foldername(name))[1] OR
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id::text = (storage.foldername(name))[1]
            AND (p.architect_id = auth.uid() OR p.client_id = auth.uid())
        )
    )
);

CREATE POLICY "Users can delete their project documents" ON storage.objects
FOR DELETE USING (
    bucket_id = 'project-documents' AND (
        auth.uid()::text = (storage.foldername(name))[1] OR
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id::text = (storage.foldername(name))[1]
            AND (p.architect_id = auth.uid() OR p.client_id = auth.uid())
        )
    )
);

-- User Avatars Bucket Policies
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'user-avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'user-avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'user-avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar" ON storage.objects
FOR DELETE USING (
    bucket_id = 'user-avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Project Images Bucket Policies
CREATE POLICY "Anyone can view project images" ON storage.objects
FOR SELECT USING (bucket_id = 'project-images');

CREATE POLICY "Authenticated users can upload project images" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'project-images' AND 
    auth.role() = 'authenticated' AND
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id::text = (storage.foldername(name))[1]
        AND (p.architect_id = auth.uid() OR p.client_id = auth.uid())
    )
);

CREATE POLICY "Project owners can update images" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'project-images' AND
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id::text = (storage.foldername(name))[1]
        AND (p.architect_id = auth.uid() OR p.client_id = auth.uid())
    )
);

CREATE POLICY "Project owners can delete images" ON storage.objects
FOR DELETE USING (
    bucket_id = 'project-images' AND
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id::text = (storage.foldername(name))[1]
        AND (p.architect_id = auth.uid() OR p.client_id = auth.uid())
    )
);

-- Temp Uploads Bucket Policies
CREATE POLICY "Users can manage their temp uploads" ON storage.objects
FOR ALL USING (
    bucket_id = 'temp-uploads' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- ========================================
-- 3. STORAGE FUNCTIONS
-- ========================================

-- Function to get file info
CREATE OR REPLACE FUNCTION get_file_info(file_path TEXT)
RETURNS TABLE (
    name TEXT,
    size BIGINT,
    content_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    bucket_id TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.name,
        o.size,
        o.content_type,
        o.created_at,
        o.bucket_id
    FROM storage.objects o
    WHERE o.name = file_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access file
CREATE OR REPLACE FUNCTION can_access_file(file_path TEXT, user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
    bucket_name TEXT;
    folder_path TEXT[];
    project_id UUID;
    has_access BOOLEAN := FALSE;
BEGIN
    -- Extract bucket and folder path
    SELECT split_part(file_path, '/', 1) INTO bucket_name;
    SELECT string_to_array(split_part(file_path, '/', 2), '/') INTO folder_path;
    
    -- Check different bucket access rules
    IF bucket_name = 'project-documents' THEN
        -- Check if user owns the project or is assigned to it
        BEGIN
            SELECT id::UUID INTO project_id FROM (SELECT unnest(folder_path) as id) sub WHERE id ~ '^[a-f0-9-]{36}$' LIMIT 1;
            
            IF project_id IS NOT NULL THEN
                SELECT EXISTS(
                    SELECT 1 FROM projects p 
                    WHERE p.id = project_id 
                    AND (p.client_id = user_id OR p.architect_id = user_id)
                ) INTO has_access;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            has_access := FALSE;
        END;
        
    ELSIF bucket_name = 'user-avatars' OR bucket_name = 'temp-uploads' THEN
        -- Check if file belongs to user
        IF folder_path[1] = user_id::text THEN
            has_access := TRUE;
        END IF;
        
    ELSIF bucket_name = 'project-images' THEN
        -- Public bucket, but check if user can upload to project
        BEGIN
            SELECT id::UUID INTO project_id FROM (SELECT unnest(folder_path) as id) sub WHERE id ~ '^[a-f0-9-]{36}$' LIMIT 1;
            
            IF project_id IS NOT NULL THEN
                SELECT exists(
                    SELECT 1 FROM projects p 
                    WHERE p.id = project_id 
                    AND (p.client_id = user_id OR p.architect_id = user_id)
                ) INTO has_access;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            has_access := FALSE;
        END;
    END IF;
    
    RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 4. STORAGE TRIGGERS
-- ========================================

-- Function to log file uploads
CREATE OR REPLACE FUNCTION log_file_upload()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO activities (user_id, action, entity_type, entity_id, details)
    VALUES (
        auth.uid(),
        'UPLOAD',
        'file',
        NEW.id,
        json_build_object(
            'file_name', NEW.name,
            'bucket_id', NEW.bucket_id,
            'file_size', NEW.size,
            'content_type', NEW.content_type
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to log file uploads
CREATE TRIGGER log_file_uploads AFTER INSERT ON storage.objects
    FOR EACH ROW EXECUTE FUNCTION log_file_upload();

-- ========================================
-- 5. CLEANUP FUNCTIONS
-- ========================================

-- Function to clean up temp uploads older than 24 hours
CREATE OR REPLACE FUNCTION cleanup_temp_uploads()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM storage.objects 
    WHERE bucket_id = 'temp-uploads' 
    AND created_at < now() - interval '24 hours';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 6. COMPLETION MESSAGE
-- ========================================

-- Log setup completion
DO $$
BEGIN
    RAISE NOTICE 'Home Design Lab storage setup completed successfully!';
    RAISE NOTICE 'Buckets created: project-documents, user-avatars, project-images, temp-uploads';
    RAISE NOTICE 'Storage policies and functions have been applied';
    RAISE NOTICE 'Ready for file uploads and management';
END $$;
