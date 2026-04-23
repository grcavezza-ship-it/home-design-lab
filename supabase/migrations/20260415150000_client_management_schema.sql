-- Home Design Lab - Client Management Schema
-- Migration per gestione completa clienti e file

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. UTENTI (Estensione del sistema di auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    phone TEXT,
    company_name TEXT,
    role TEXT CHECK (role IN ('client', 'architect', 'admin', 'contractor')) DEFAULT 'client',
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. PROGETTI (Collegati ai clienti)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK (category IN ('residenziale', 'commerciale', 'ristorativo', 'ufficio', 'altre')) DEFAULT 'residenziale',
    status TEXT CHECK (status IN ('lead', 'prospect', 'active', 'completed', 'cancelled', 'on_hold')) DEFAULT 'lead',
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    budget_range TEXT,
    location TEXT,
    start_date DATE,
    end_date DATE,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. DOCUMENTI E FILE
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    file_type TEXT CHECK (file_type IN ('plan', 'render', 'photo', 'contract', 'invoice', 'technical', 'presentation', 'other')) DEFAULT 'other',
    file_path TEXT NOT NULL, -- Percorso Supabase Storage
    file_name TEXT NOT NULL,
    file_size BIGINT, -- in bytes
    mime_type TEXT,
    is_public BOOLEAN DEFAULT false, -- Visibile al cliente
    is_downloadable BOOLEAN DEFAULT true,
    uploaded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. MESSAGGI E COMUNICAZIONI
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject TEXT,
    content TEXT NOT NULL,
    message_type TEXT CHECK (message_type IN ('text', 'file_share', 'update', 'alert')) DEFAULT 'text',
    is_read BOOLEAN DEFAULT false,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. ATTIVITÀ E LOG
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    activity_type TEXT CHECK (activity_type IN ('project_created', 'project_updated', 'document_uploaded', 'document_viewed', 'message_sent', 'login', 'file_downloaded')) DEFAULT 'project_updated',
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}', -- Dati aggiuntivi strutturati
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TASK/TO-DO
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('todo', 'in_progress', 'review', 'completed', 'cancelled')) DEFAULT 'todo',
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. FOLDER STRUTTURA PER STORAGE
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    parent_folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. PERMESSI ACCESSO
CREATE TABLE IF NOT EXISTS public.project_permissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    permission_level TEXT CHECK (permission_level IN ('read', 'write', 'admin', 'owner')) DEFAULT 'read',
    granted_by UUID REFERENCES public.profiles(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(project_id, user_id)
);

-- 9. NOTIFICHE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT CHECK (notification_type IN ('info', 'warning', 'error', 'success', 'document_shared', 'message_received', 'task_assigned')) DEFAULT 'info',
    related_entity_type TEXT, -- 'project', 'document', 'message', 'task'
    related_entity_id UUID,
    is_read BOOLEAN DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. SETTINGS PREFERENCES
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    theme TEXT CHECK (theme IN ('light', 'dark', 'auto')) DEFAULT 'auto',
    language TEXT DEFAULT 'it',
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    timezone TEXT DEFAULT 'Europe/Rome',
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- INDEXES per performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON public.documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON public.documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON public.documents(file_type);
CREATE INDEX IF NOT EXISTS idx_messages_project_id ON public.messages(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_activities_project_id ON public.activities(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- RLS (Row Level Security) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Profiles: utenti possono vedere solo il proprio profilo
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Projects: visibili a seconda dei permessi
CREATE POLICY "Projects view based on permissions" ON public.projects
    FOR SELECT USING (
        auth.uid() = client_id OR 
        auth.uid() = created_by OR
        id IN (
            SELECT project_id FROM public.project_permissions 
            WHERE user_id = auth.uid()
        )
    );

-- Documents: visibili a seconda dei permessi e del flag is_public
CREATE POLICY "Documents view based on permissions" ON public.documents
    FOR SELECT USING (
        is_public = true OR
        auth.uid() = client_id OR
        auth.uid() = uploaded_by OR
        project_id IN (
            SELECT project_id FROM public.project_permissions 
            WHERE user_id = auth.uid() AND permission_level IN ('read', 'write', 'admin', 'owner')
        )
    );

-- Messages: visibili solo a sender e recipient
CREATE POLICY "Messages view for participants" ON public.messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Activities: visibili per progetti a cui si ha accesso
CREATE POLICY "Activities view based on project access" ON public.activities
    FOR SELECT USING (
        project_id IN (
            SELECT project_id FROM public.projects 
            WHERE client_id = auth.uid() OR created_by = auth.uid() OR
            id IN (
                SELECT project_id FROM public.project_permissions 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Tasks: visibili per progetti a cui si ha accesso
CREATE POLICY "Tasks view based on project access" ON public.tasks
    FOR SELECT USING (
        project_id IN (
            SELECT project_id FROM public.projects 
            WHERE client_id = auth.uid() OR created_by = auth.uid() OR
            id IN (
                SELECT project_id FROM public.project_permissions 
                WHERE user_id = auth.uid()
            )
        ) OR assigned_to = auth.uid()
    );

-- Notifications: solo dell'utente
CREATE POLICY "Notifications view own" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

-- User preferences: solo dell'utente
CREATE POLICY "User preferences own" ON public.user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Functions per timestamp automatici
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers per updated_at
CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_folders_updated_at
    BEFORE UPDATE ON public.folders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function per creare profilo utente automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger per creare profilo al signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function per log attività automatico
CREATE OR REPLACE FUNCTION public.log_activity(activity_type_param TEXT, description_param TEXT, metadata_param JSONB DEFAULT '{}')
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.activities (project_id, user_id, activity_type, description, metadata)
    VALUES (
        COALESCE(NEW.project_id, OLD.project_id),
        auth.uid(),
        activity_type_param,
        description_param,
        metadata_param
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Storage Buckets (da creare via Supabase Dashboard)
-- 1. project-documents
-- 2. user-avatars
-- 3. project-images

-- Commenti finali
COMMENT ON TABLE public.profiles IS 'Profili utenti estesi del sistema di auth';
COMMENT ON TABLE public.projects IS 'Progetti architettonici associati ai clienti';
COMMENT ON TABLE public.documents IS 'Documenti e file caricati per i progetti';
COMMENT ON TABLE public.messages IS 'Messaggi e comunicazioni tra utenti';
COMMENT ON TABLE public.activities IS 'Log attività e audit trail';
COMMENT ON TABLE public.tasks IS 'Task e to-do associati ai progetti';
COMMENT ON TABLE public.folders IS 'Struttura cartelle per organizzazione file';
COMMENT ON TABLE public.project_permissions IS 'Permessi accesso ai progetti';
COMMENT ON TABLE public.notifications IS 'Notifiche per utenti';
COMMENT ON TABLE public.user_preferences IS 'Preferenze personalizzate utenti';
