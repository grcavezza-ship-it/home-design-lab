-- Adatta database esistente con tabella clienti - VERSIONE FINALE DEFINITIVA
-- Esegui questo in Supabase SQL Editor: https://supabase.com/dashboard/project/amhqqszzxmrphisxlsnj/sql

-- ========================================
-- 1. ANALISI TABELLA CLIENTI ESISTENTE
-- ========================================

-- Prima controlliamo la struttura della tabella clienti esistente
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'clienti' 
-- ORDER BY ordinal_position;

-- ========================================
-- 2. RINOMINA/ADATTA TABELLA CLIENTI ESISTENTE
-- ========================================

-- Se la tabella clienti esiste, la adattiamo per essere compatibile
-- Aggiungiamo colonne mancanti se non esistono
DO $$
BEGIN
    -- Controlla se la tabella clienti esiste
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clienti') THEN
        RAISE NOTICE 'Tabella clienti trovata, aggiungo colonne mancanti...';
        
        -- Aggiungi colonne se non esistono
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'clienti' AND column_name = 'id') THEN
            ALTER TABLE clienti ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'clienti' AND column_name = 'user_id') THEN
            ALTER TABLE clienti ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'clienti' AND column_name = 'role') THEN
            ALTER TABLE clienti ADD COLUMN role TEXT DEFAULT 'client' CHECK (role IN ('client', 'architect', 'admin'));
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'clienti' AND column_name = 'is_active') THEN
            ALTER TABLE clienti ADD COLUMN is_active BOOLEAN DEFAULT true;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'clienti' AND column_name = 'avatar_url') THEN
            ALTER TABLE clienti ADD COLUMN avatar_url TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'clienti' AND column_name = 'created_at') THEN
            ALTER TABLE clienti ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'clienti' AND column_name = 'updated_at') THEN
            ALTER TABLE clienti ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
        END IF;
        
        -- Rinomina la tabella clienti in profiles se non esiste già profiles
        IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
            ALTER TABLE clienti RENAME TO profiles;
            RAISE NOTICE 'Tabella clienti rinominata in profiles';
        END IF;
        
    ELSE
        RAISE NOTICE 'Tabella clienti non trovata, creo nuova tabella profiles...';
    END IF;
END $$;

-- ========================================
-- 3. CREAZIONE TABELLE SENZA FOREIGN KEYS (PRIMA FASE)
-- ========================================

-- Projects table (senza foreign keys per ora)
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    client_id UUID,
    architect_id UUID,
    status TEXT DEFAULT 'lead' CHECK (status IN ('lead', 'active', 'completed', 'cancelled')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    budget DECIMAL(12,2),
    start_date DATE,
    end_date DATE,
    images JSONB DEFAULT '[]',
    location TEXT,
    project_type TEXT CHECK (project_type IN ('residential', 'commercial', 'renovation', 'interior')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Folders table (senza foreign keys per ora)
CREATE TABLE IF NOT EXISTS folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    parent_id UUID,
    project_id UUID,
    user_id UUID,
    folder_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Documents table (senza foreign keys per ora)
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    user_id UUID,
    project_id UUID,
    folder_id UUID,
    is_public BOOLEAN DEFAULT false,
    tags JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Messages table (senza foreign keys per ora)
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID,
    receiver_id UUID,
    project_id UUID,
    subject TEXT,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system')),
    attachments JSONB DEFAULT '[]',
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Activities table (senza foreign keys per ora)
CREATE TABLE IF NOT EXISTS activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    project_id UUID,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    details JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tasks table (senza foreign keys per ora)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID,
    created_by UUID,
    project_id UUID,
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed', 'cancelled')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Notifications table (senza foreign keys per ora)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    is_read BOOLEAN DEFAULT false,
    action_url TEXT,
    action_text TEXT,
    metadata JSONB DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Permissions table (senza foreign keys per ora)
CREATE TABLE IF NOT EXISTS permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    permission TEXT NOT NULL CHECK (permission IN ('read', 'write', 'delete', 'admin')),
    granted_by UUID,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ========================================
-- 4. AGGIUNTA FOREIGN KEYS (SECONDA FASE)
-- ========================================

-- Aggiungi foreign keys a projects
DO $$
BEGIN
    -- Client foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'projects_client_id_fkey'
    ) THEN
        ALTER TABLE projects 
        ADD CONSTRAINT projects_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
    
    -- Architect foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'projects_architect_id_fkey'
    ) THEN
        ALTER TABLE projects 
        ADD CONSTRAINT projects_architect_id_fkey 
        FOREIGN KEY (architect_id) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Aggiungi foreign keys a folders
DO $$
BEGIN
    -- Parent foreign key (self reference)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'folders_parent_id_fkey'
    ) THEN
        ALTER TABLE folders 
        ADD CONSTRAINT folders_parent_id_fkey 
        FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE;
    END IF;
    
    -- Project foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'folders_project_id_fkey'
    ) THEN
        ALTER TABLE folders 
        ADD CONSTRAINT folders_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
    
    -- User foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'folders_user_id_fkey'
    ) THEN
        ALTER TABLE folders 
        ADD CONSTRAINT folders_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Aggiungi foreign keys a documents
DO $$
BEGIN
    -- User foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'documents_user_id_fkey'
    ) THEN
        ALTER TABLE documents 
        ADD CONSTRAINT documents_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- Project foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'documents_project_id_fkey'
    ) THEN
        ALTER TABLE documents 
        ADD CONSTRAINT documents_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
    
    -- Folder foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'documents_folder_id_fkey'
    ) THEN
        ALTER TABLE documents 
        ADD CONSTRAINT documents_folder_id_fkey 
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Aggiungi foreign keys a messages
DO $$
BEGIN
    -- Sender foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_sender_id_fkey'
    ) THEN
        ALTER TABLE messages 
        ADD CONSTRAINT messages_sender_id_fkey 
        FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- Receiver foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_receiver_id_fkey'
    ) THEN
        ALTER TABLE messages 
        ADD CONSTRAINT messages_receiver_id_fkey 
        FOREIGN KEY (receiver_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- Project foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_project_id_fkey'
    ) THEN
        ALTER TABLE messages 
        ADD CONSTRAINT messages_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Aggiungi foreign keys a activities
DO $$
BEGIN
    -- User foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'activities_user_id_fkey'
    ) THEN
        ALTER TABLE activities 
        ADD CONSTRAINT activities_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- Project foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'activities_project_id_fkey'
    ) THEN
        ALTER TABLE activities 
        ADD CONSTRAINT activities_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Aggiungi foreign keys a tasks
DO $$
BEGIN
    -- Assigned to foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_assigned_to_fkey'
    ) THEN
        ALTER TABLE tasks 
        ADD CONSTRAINT tasks_assigned_to_fkey 
        FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
    
    -- Created by foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_created_by_fkey'
    ) THEN
        ALTER TABLE tasks 
        ADD CONSTRAINT tasks_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- Project foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_project_id_fkey'
    ) THEN
        ALTER TABLE tasks 
        ADD CONSTRAINT tasks_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Aggiungi foreign keys a notifications
DO $$
BEGIN
    -- User foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notifications_user_id_fkey'
    ) THEN
        ALTER TABLE notifications 
        ADD CONSTRAINT notifications_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Aggiungi foreign keys a permissions
DO $$
BEGIN
    -- User foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'permissions_user_id_fkey'
    ) THEN
        ALTER TABLE permissions 
        ADD CONSTRAINT permissions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- Granted by foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'permissions_granted_by_fkey'
    ) THEN
        ALTER TABLE permissions 
        ADD CONSTRAINT permissions_granted_by_fkey 
        FOREIGN KEY (granted_by) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ========================================
-- 5. CREAZIONE INDICI
-- ========================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(is_active);

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_architect ON projects(architect_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at);

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_public ON documents(is_public);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

-- Activities indexes
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_project ON activities(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at);

-- Folders indexes
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_project ON folders(project_id);
CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_path ON folders(folder_path);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- Permissions indexes
CREATE INDEX IF NOT EXISTS idx_permissions_user ON permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_permissions_permission ON permissions(permission);

-- ========================================
-- 6. TRIGGERS E FUNZIONI
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
DO $$
BEGIN
    -- Profiles trigger
    IF EXISTS (SELECT FROM information_schema.triggers WHERE trigger_name = 'update_profiles_updated_at') THEN
        DROP TRIGGER update_profiles_updated_at ON profiles;
    END IF;
    CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- Projects trigger
    IF EXISTS (SELECT FROM information_schema.triggers WHERE trigger_name = 'update_projects_updated_at') THEN
        DROP TRIGGER update_projects_updated_at ON projects;
    END IF;
    CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- Documents trigger
    IF EXISTS (SELECT FROM information_schema.triggers WHERE trigger_name = 'update_documents_updated_at') THEN
        DROP TRIGGER update_documents_updated_at ON documents;
    END IF;
    CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- Folders trigger
    IF EXISTS (SELECT FROM information_schema.triggers WHERE trigger_name = 'update_folders_updated_at') THEN
        DROP TRIGGER update_folders_updated_at ON folders;
    END IF;
    CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON folders
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- Tasks trigger
    IF EXISTS (SELECT FROM information_schema.triggers WHERE trigger_name = 'update_tasks_updated_at') THEN
        DROP TRIGGER update_tasks_updated_at ON tasks;
    END IF;
    CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );
  RETURN NEW;
END;
$$ language plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') THEN
        DROP TRIGGER on_auth_user_created ON auth.users;
    END IF;
    CREATE OR REPLACE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
END $$;

-- ========================================
-- 7. ENABLE ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
DO $$
BEGIN
    -- Profiles
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'profiles' AND rowsecurity = true) THEN
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Other tables
    ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
    ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
    ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
    ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
    ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
    ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
END $$;

-- ========================================
-- 8. RLS POLICIES
-- ========================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Projects policies
DROP POLICY IF EXISTS "Users can view assigned projects" ON projects;
CREATE POLICY "Users can view assigned projects" ON projects
    FOR SELECT USING (
        client_id = auth.uid() OR 
        architect_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Architects and admins can manage projects" ON projects;
CREATE POLICY "Architects and admins can manage projects" ON projects
    FOR ALL USING (
        (architect_id = auth.uid() OR client_id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'architect')
        )
    );

-- Documents policies
DROP POLICY IF EXISTS "Users can view own documents" ON documents;
CREATE POLICY "Users can view own documents" ON documents
    FOR SELECT USING (
        user_id = auth.uid() OR 
        is_public = true OR
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = documents.project_id 
            AND (p.client_id = auth.uid() OR p.architect_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can manage own documents" ON documents;
CREATE POLICY "Users can manage own documents" ON documents
    FOR ALL USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = documents.project_id 
            AND (p.architect_id = auth.uid() OR p.client_id = auth.uid())
        )
    );

-- Messages policies
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
CREATE POLICY "Users can view own messages" ON messages
    FOR SELECT USING (
        sender_id = auth.uid() OR 
        receiver_id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own messages" ON messages;
CREATE POLICY "Users can update own messages" ON messages
    FOR UPDATE USING (
        sender_id = auth.uid() OR 
        receiver_id = auth.uid()
    );

-- Activities policies (read-only for most users)
DROP POLICY IF EXISTS "Users can view own activities" ON activities;
CREATE POLICY "Users can view own activities" ON activities
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Folders policies
DROP POLICY IF EXISTS "Users can view own folders" ON folders;
CREATE POLICY "Users can view own folders" ON folders
    FOR SELECT USING (
        user_id = auth.uid() OR 
        project_id IN (
            SELECT id FROM projects 
            WHERE client_id = auth.uid() OR architect_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage own folders" ON folders;
CREATE POLICY "Users can manage own folders" ON folders
    FOR ALL USING (
        user_id = auth.uid() OR
        project_id IN (
            SELECT id FROM projects 
            WHERE architect_id = auth.uid() OR client_id = auth.uid()
        )
    );

-- Tasks policies
DROP POLICY IF EXISTS "Users can view assigned tasks" ON tasks;
CREATE POLICY "Users can view assigned tasks" ON tasks
    FOR SELECT USING (
        assigned_to = auth.uid() OR 
        created_by = auth.uid() OR
        project_id IN (
            SELECT id FROM projects 
            WHERE client_id = auth.uid() OR architect_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage assigned tasks" ON tasks;
CREATE POLICY "Users can manage assigned tasks" ON tasks
    FOR ALL USING (
        assigned_to = auth.uid() OR 
        created_by = auth.uid() OR
        project_id IN (
            SELECT id FROM projects 
            WHERE architect_id = auth.uid() OR client_id = auth.uid()
        )
    );

-- Notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Permissions policies
DROP POLICY IF EXISTS "Users can view own permissions" ON permissions;
CREATE POLICY "Users can view own permissions" ON permissions
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage permissions" ON permissions;
CREATE POLICY "Admins can manage permissions" ON permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ========================================
-- 9. DATI ESEMPIO (OPZIONALE)
-- ========================================

-- Inserisci dati esempio solo se le tabelle sono vuote
DO $$
BEGIN
    -- Inserisci progetto esempio
    IF (SELECT COUNT(*) FROM projects) = 0 THEN
        INSERT INTO projects (title, description, status, progress_percentage, project_type)
        VALUES (
            'Villa Moderna - Progetto Esempio',
            'Progetto di ristrutturazione completa con design moderno e sostenibile.',
            'active',
            25,
            'residential'
        );
        RAISE NOTICE 'Progetto esempio inserito';
    END IF;
    
    -- Inserisci documento esempio
    IF (SELECT COUNT(*) FROM documents) = 0 THEN
        INSERT INTO documents (name, description, file_url, file_type)
        VALUES (
            'Documentazione Progetto.pdf',
            'Documentazione completa del progetto',
            'https://example.com/doc.pdf',
            'application/pdf'
        );
        RAISE NOTICE 'Documento esempio inserito';
    END IF;
END $$;

-- ========================================
-- 10. COMPLETION MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'Database Home Design Lab adattato con successo!';
    RAISE NOTICE 'Tabella clienti convertita in profiles (se esisteva)';
    RAISE NOTICE 'Tabelle create: projects, folders, documents, messages, activities, tasks, notifications, permissions';
    RAISE NOTICE 'Foreign keys aggiunte correttamente';
    RAISE NOTICE 'Indici, trigger e RLS policies applicati';
    RAISE NOTICE 'Pronto per l''uso con il sistema Home Design Lab';
END $$;
