-- Storage Setup for Personal Files - Home Design Lab
-- Esegui questo in Supabase SQL Editor: https://supabase.com/dashboard/project/amhqqszzxmrphisxlsnj/sql

-- ========================================
-- 1. CREATE STORAGE BUCKETS FOR PERSONAL FILES
-- ========================================

-- Create buckets for different file types with personal access
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES 
    ('client-documents', 'client-documents', false, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png', 'image/gif', 'text/plain']),
    ('project-files', 'project-files', false, 104857600, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'application/zip', 'application/x-zip-compressed']),
    ('personal-avatars', 'personal-avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
    ('project-images', 'project-images', true, 104857600, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']),
    ('temp-uploads', 'temp-uploads', false, 104857600, ARRAY['*']),
    ('shared-files', 'shared-files', true, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'text/plain'])
ON CONFLICT (id) DO UPDATE SET 
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ========================================
-- 2. STORAGE POLICIES FOR PERSONAL ACCESS
-- ========================================

-- Client Documents Bucket Policies (private, user-specific)
DROP POLICY IF EXISTS "Users can view their client documents" ON storage.objects;
CREATE POLICY "Users can view their client documents" ON storage.objects
FOR SELECT USING (
    bucket_id = 'client-documents' AND (
        auth.uid()::text = (storage.foldername(name))[1] OR
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN projects pr ON p.id = pr.client_id OR p.id = pr.architect_id
            WHERE p.user_id = auth.uid() 
            AND pr.id::text = (storage.foldername(name))[1]
        )
    )
);

DROP POLICY IF EXISTS "Users can upload their client documents" ON storage.objects;
CREATE POLICY "Users can upload their client documents" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'client-documents' AND (
        auth.uid()::text = (storage.foldername(name))[1] OR
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN projects pr ON p.id = pr.client_id OR p.id = pr.architect_id
            WHERE p.user_id = auth.uid() 
            AND pr.id::text = (storage.foldername(name))[1]
        )
    )
);

DROP POLICY IF EXISTS "Users can update their client documents" ON storage.objects;
CREATE POLICY "Users can update their client documents" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'client-documents' AND (
        auth.uid()::text = (storage.foldername(name))[1] OR
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN projects pr ON p.id = pr.client_id OR p.id = pr.architect_id
            WHERE p.user_id = auth.uid() 
            AND pr.id::text = (storage.foldername(name))[1]
        )
    )
);

DROP POLICY IF EXISTS "Users can delete their client documents" ON storage.objects;
CREATE POLICY "Users can delete their client documents" ON storage.objects
FOR DELETE USING (
    bucket_id = 'client-documents' AND (
        auth.uid()::text = (storage.foldername(name))[1] OR
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN projects pr ON p.id = pr.client_id OR p.id = pr.architect_id
            WHERE p.user_id = auth.uid() 
            AND pr.id::text = (storage.foldername(name))[1]
        )
    )
);

-- Project Files Bucket Policies (project-specific access)
DROP POLICY IF EXISTS "Users can view their project files" ON storage.objects;
CREATE POLICY "Users can view their project files" ON storage.objects
FOR SELECT USING (
    bucket_id = 'project-files' AND (
        auth.uid()::text = (storage.foldername(name))[1] OR
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN projects pr ON p.id = pr.client_id OR p.id = pr.architect_id
            WHERE p.user_id = auth.uid() 
            AND pr.id::text = (storage.foldername(name))[1]
        )
    )
);

DROP POLICY IF EXISTS "Users can upload their project files" ON storage.objects;
CREATE POLICY "Users can upload their project files" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'project-files' AND (
        auth.uid()::text = (storage.foldername(name))[1] OR
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN projects pr ON p.id = pr.client_id OR p.id = pr.architect_id
            WHERE p.user_id = auth.uid() 
            AND pr.id::text = (storage.foldername(name))[1]
        )
    )
);

DROP POLICY IF EXISTS "Users can update their project files" ON storage.objects;
CREATE POLICY "Users can update their project files" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'project-files' AND (
        auth.uid()::text = (storage.foldername(name))[1] OR
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN projects pr ON p.id = pr.client_id OR p.id = pr.architect_id
            WHERE p.user_id = auth.uid() 
            AND pr.id::text = (storage.foldername(name))[1]
        )
    )
);

DROP POLICY IF EXISTS "Users can delete their project files" ON storage.objects;
CREATE POLICY "Users can delete their project files" ON storage.objects
FOR DELETE USING (
    bucket_id = 'project-files' AND (
        auth.uid()::text = (storage.foldername(name))[1] OR
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN projects pr ON p.id = pr.client_id OR p.id = pr.architect_id
            WHERE p.user_id = auth.uid() 
            AND pr.id::text = (storage.foldername(name))[1]
        )
    )
);

-- Personal Avatars Bucket Policies (user-specific)
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'personal-avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'personal-avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'personal-avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar" ON storage.objects
FOR DELETE USING (
    bucket_id = 'personal-avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Project Images Bucket Policies (public but controlled upload)
DROP POLICY IF EXISTS "Anyone can view project images" ON storage.objects;
CREATE POLICY "Anyone can view project images" ON storage.objects
FOR SELECT USING (bucket_id = 'project-images');

DROP POLICY IF EXISTS "Authenticated users can upload project images" ON storage.objects;
CREATE POLICY "Authenticated users can upload project images" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'project-images' AND 
    auth.role() = 'authenticated' AND
    EXISTS (
        SELECT 1 FROM profiles p
        JOIN projects pr ON p.id = pr.client_id OR p.id = pr.architect_id
        WHERE p.user_id = auth.uid()
        AND pr.id::text = (storage.foldername(name))[1]
    )
);

DROP POLICY IF EXISTS "Project owners can update images" ON storage.objects;
CREATE POLICY "Project owners can update images" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'project-images' AND
    EXISTS (
        SELECT 1 FROM profiles p
        JOIN projects pr ON p.id = pr.client_id OR p.id = pr.architect_id
        WHERE p.user_id = auth.uid()
        AND pr.id::text = (storage.foldername(name))[1]
    )
);

DROP POLICY IF EXISTS "Project owners can delete images" ON storage.objects;
CREATE POLICY "Project owners can delete images" ON storage.objects
FOR DELETE USING (
    bucket_id = 'project-images' AND
    EXISTS (
        SELECT 1 FROM profiles p
        JOIN projects pr ON p.id = pr.client_id OR p.id = pr.architect_id
        WHERE p.user_id = auth.uid()
        AND pr.id::text = (storage.foldername(name))[1]
    )
);

-- Temp Uploads Bucket Policies (user-specific temporary storage)
DROP POLICY IF EXISTS "Users can manage their temp uploads" ON storage.objects;
CREATE POLICY "Users can manage their temp uploads" ON storage.objects
FOR ALL USING (
    bucket_id = 'temp-uploads' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Shared Files Bucket Policies (public files for sharing)
DROP POLICY IF EXISTS "Anyone can view shared files" ON storage.objects;
CREATE POLICY "Anyone can view shared files" ON storage.objects
FOR SELECT USING (bucket_id = 'shared-files');

DROP POLICY IF EXISTS "Authenticated users can upload shared files" ON storage.objects;
CREATE POLICY "Authenticated users can upload shared files" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'shared-files' AND 
    auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Admins can manage shared files" ON storage.objects;
CREATE POLICY "Admins can manage shared files" ON storage.objects
FOR ALL USING (
    bucket_id = 'shared-files' AND
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- ========================================
-- 3. STORAGE FUNCTIONS FOR PERSONAL FILES
-- ========================================

-- Function to get user's personal files
CREATE OR REPLACE FUNCTION get_user_files(user_id_param UUID DEFAULT auth.uid(), bucket_name TEXT DEFAULT 'client-documents')
RETURNS TABLE (
    name TEXT,
    size BIGINT,
    content_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    bucket_id TEXT,
    file_path TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.name,
        o.size,
        o.content_type,
        o.created_at,
        o.bucket_id,
        o.name as file_path
    FROM storage.objects o
    WHERE o.bucket_id = bucket_name
    AND (
        user_id_param::text = (storage.foldername(o.name))[1] OR
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN projects pr ON p.id = pr.client_id OR p.id = pr.architect_id
            WHERE p.user_id = user_id_param 
            AND pr.id::text = (storage.foldername(o.name))[1]
        )
    )
    ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get project files
CREATE OR REPLACE FUNCTION get_project_files(project_id_param UUID)
RETURNS TABLE (
    name TEXT,
    size BIGINT,
    content_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    bucket_id TEXT,
    file_path TEXT,
    uploaded_by TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.name,
        o.size,
        o.content_type,
        o.created_at,
        o.bucket_id,
        o.name as file_path,
        (storage.foldername(o.name))[1] as uploaded_by
    FROM storage.objects o
    WHERE o.bucket_id IN ('project-files', 'client-documents')
    AND (storage.foldername(o.name))[1] = project_id_param::text
    ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access file
CREATE OR REPLACE FUNCTION can_access_personal_file(file_path TEXT, user_id_param UUID DEFAULT auth.uid())
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
    IF bucket_name = 'client-documents' OR bucket_name = 'project-files' THEN
        -- Check if user owns the project or is assigned to it
        BEGIN
            SELECT id::UUID INTO project_id FROM (SELECT unnest(folder_path) as id) sub WHERE id ~ '^[a-f0-9-]{36}$' LIMIT 1;
            
            IF project_id IS NOT NULL THEN
                SELECT EXISTS(
                    SELECT 1 FROM profiles p
                    JOIN projects pr ON p.id = pr.client_id OR p.id = pr.architect_id
                    WHERE p.user_id = user_id_param 
                    AND pr.id = project_id
                ) INTO has_access;
            ELSE
                -- Check if it's user's personal folder
                IF folder_path[1] = user_id_param::text THEN
                    has_access := TRUE;
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            has_access := FALSE;
        END;
        
    ELSIF bucket_name = 'personal-avatars' OR bucket_name = 'temp-uploads' THEN
        -- Check if file belongs to user
        IF folder_path[1] = user_id_param::text THEN
            has_access := TRUE;
        END IF;
        
    ELSIF bucket_name = 'project-images' OR bucket_name = 'shared-files' THEN
        -- Public buckets - check if user can upload to project
        BEGIN
            SELECT id::UUID INTO project_id FROM (SELECT unnest(folder_path) as id) sub WHERE id ~ '^[a-f0-9-]{36}$' LIMIT 1;
            
            IF project_id IS NOT NULL THEN
                SELECT exists(
                    SELECT 1 FROM profiles p
                    JOIN projects pr ON p.id = pr.client_id OR p.id = pr.architect_id
                    WHERE p.user_id = user_id_param 
                    AND pr.id = project_id
                ) INTO has_access;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            has_access := FALSE;
        END;
    END IF;
    
    RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get file statistics for user
CREATE OR REPLACE FUNCTION get_user_file_stats(user_id_param UUID DEFAULT auth.uid())
RETURNS TABLE (
    bucket_name TEXT,
    file_count BIGINT,
    total_size BIGINT,
    last_upload TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.bucket_id,
        COUNT(*) as file_count,
        COALESCE(SUM(o.size), 0) as total_size,
        MAX(o.created_at) as last_upload
    FROM storage.objects o
    WHERE (
        user_id_param::text = (storage.foldername(o.name))[1] OR
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN projects pr ON p.id = pr.client_id OR p.id = pr.architect_id
            WHERE p.user_id = user_id_param 
            AND pr.id::text = (storage.foldername(o.name))[1]
        )
    )
    GROUP BY o.bucket_id
    ORDER BY file_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 4. STORAGE TRIGGERS FOR PERSONAL FILES
-- ========================================

-- Function to log file uploads to activities
CREATE OR REPLACE FUNCTION log_personal_file_upload()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO activities (user_id, action, entity_type, entity_id, details)
    VALUES (
        auth.uid(),
        'UPLOAD_FILE',
        'file',
        NEW.id,
        json_build_object(
            'file_name', NEW.name,
            'bucket_id', NEW.bucket_id,
            'file_size', NEW.size,
            'content_type', NEW.content_type,
            'file_path', NEW.name
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to log file uploads
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.triggers WHERE trigger_name = 'log_personal_file_uploads') THEN
        DROP TRIGGER log_personal_file_uploads ON storage.objects;
    END IF;
    CREATE TRIGGER log_personal_file_uploads AFTER INSERT ON storage.objects
        FOR EACH ROW EXECUTE FUNCTION log_personal_file_upload();
END $$;

-- ========================================
-- 5. CLEANUP FUNCTIONS FOR PERSONAL FILES
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

-- Function to clean up orphaned files (files without associated projects/users)
CREATE OR REPLACE FUNCTION cleanup_orphaned_files()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Clean up files in project buckets where project doesn't exist
    DELETE FROM storage.objects 
    WHERE bucket_id IN ('project-files', 'client-documents')
    AND NOT EXISTS (
        SELECT 1 FROM projects pr
        WHERE pr.id::text = (storage.foldername(name))[1]
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 6. STORAGE VIEWS FOR EASY ACCESS
-- ========================================

-- View for user's personal files
CREATE OR REPLACE VIEW user_personal_files AS
SELECT 
    o.name,
    o.size,
    o.content_type,
    o.created_at,
    o.bucket_id,
    o.updated_at,
    (storage.foldername(o.name))[1] as owner_id,
    (storage.foldername(o.name))[2] as project_id_or_folder
FROM storage.objects o
WHERE (
    auth.uid()::text = (storage.foldername(o.name))[1] OR
    EXISTS (
        SELECT 1 FROM profiles p
        JOIN projects pr ON p.id = pr.client_id OR p.id = pr.architect_id
        WHERE p.user_id = auth.uid() 
        AND pr.id::text = (storage.foldername(o.name))[1]
    )
);

-- View for all files statistics
CREATE OR REPLACE VIEW storage_statistics AS
SELECT 
    bucket_id,
    COUNT(*) as file_count,
    COALESCE(SUM(size), 0) as total_size,
    COALESCE(AVG(size), 0) as avg_size,
    MIN(created_at) as oldest_file,
    MAX(created_at) as newest_file
FROM storage.objects
GROUP BY bucket_id
ORDER BY file_count DESC;

-- ========================================
-- 7. COMPLETION MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'Personal storage setup completed successfully!';
    RAISE NOTICE 'Buckets created: client-documents, project-files, personal-avatars, project-images, temp-uploads, shared-files';
    RAISE NOTICE 'Personal file access policies configured';
    RAISE NOTICE 'Functions for file management created';
    RAISE NOTICE 'Ready for personal file uploads and management';
END $$;
