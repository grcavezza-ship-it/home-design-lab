// Home Design Lab - Supabase Client Integration
// Sistema completo per gestione clienti e file con Supabase

class SupabaseClient {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.isInitialized = false;
        this.init();
    }

    async waitForConfig() {
        const maxWait = 5000; // 5 secondi max
        const startTime = Date.now();
        
        while (!window.configLoader?.get('SUPABASE_URL') && (Date.now() - startTime) < maxWait) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    async init() {
        try {
            console.log('=== Starting Supabase initialization ===');
            
            // Check if createClient function is available
            if (typeof createClient === 'undefined') {
                throw new Error('createClient function not available - Supabase library not loaded');
            }
            
            console.log('Supabase library available, creating client...');
            
            // Attendi il caricamento della configurazione
            await this.waitForConfig();
            
            // Inizializza Supabase client con configurazione sicura
            const supabaseUrl = window.configLoader?.get('SUPABASE_URL');
            const supabaseKey = window.configLoader?.get('SUPABASE_ANON_KEY');
            
            if (!supabaseUrl || !supabaseKey) {
                throw new Error('Supabase configuration not available');
            }
            
            this.supabase = createClient(supabaseUrl, supabaseKey);
            
            console.log('Supabase client created successfully');
            
            // Test basic connection
            console.log('Testing basic connection...');
            const { data, error } = await this.supabase
                .from('profiles')
                .select('count', { count: 'exact', head: true });
            
            if (error) {
                console.log('Connection test error:', error);
                if (error.code === 'PGRST116') {
                    console.log('Table profiles not found - this is expected if migration not run');
                } else {
                    throw new Error('Connection test failed: ' + error.message);
                }
            } else {
                console.log('Connection test successful, profiles count:', data);
            }
            
            this.isInitialized = true;
            console.log('Supabase client initialized successfully');
            
            // Setup auth state listener
            await this.setupAuthListener();
            
        } catch (error) {
            console.error('=== Supabase initialization failed ===');
            console.error('Error type:', typeof error);
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            this.isInitialized = false;
        }
    }

    async setupAuthListener() {
        if (!this.supabase) return;

        this.supabase.auth.onAuthStateChange(async (event, session) => {
            this.currentUser = session?.user || null;
            
            if (event === 'SIGNED_IN') {
                await this.handleSignIn(session.user);
            } else if (event === 'SIGNED_OUT') {
                await this.handleSignOut();
            }
        });
    }

    async handleSignIn(user) {
        try {
            // Carica profilo utente
            const { data: profile, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error && error.code === 'PGRST116') {
                // Profilo non esiste, crealo
                await this.createProfile(user);
            }

            // Log attività login
            await this.logActivity('login', 'Utente autenticato', {
                email: user.email
            });

        } catch (error) {
            console.error('Error handling sign in:', error);
        }
    }

    async createProfile(user) {
        try {
            const { error } = await this.supabase
                .from('profiles')
                .insert({
                    user_id: user.id,
                    email: user.email,
                    full_name: user.user_metadata?.full_name || '',
                    role: user.user_metadata?.role || 'client'
                });

            if (error) throw error;
        } catch (error) {
            console.error('Error creating profile:', error);
        }
    }

    async handleSignOut() {
        // Pulisci stato locale
        this.currentUser = null;
    }

    // Metodi di autenticazione
    async signIn(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    }

    async signUp(email, password, metadata = {}) {
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: metadata
                }
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Sign up error:', error);
            throw error;
        }
    }

    async signOut() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    }

    // Metodi per gestione progetti
    async getProjects(userId = null) {
        try {
            let query = this.supabase
                .from('projects')
                .select(`
                    *,
                    client:profiles(id, full_name, email),
                    created_by_profile:profiles(id, full_name, email)
                `);

            if (userId) {
                query = query.or(`client_id.eq.${userId},created_by.eq.${userId}`);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching projects:', error);
            return [];
        }
    }

    async createProject(projectData) {
        try {
            const { data, error } = await this.supabase
                .from('projects')
                .insert({
                    ...projectData,
                    created_by: this.currentUser?.id
                })
                .select()
                .single();

            if (error) throw error;

            // Log attività
            await this.logActivity('project_created', `Progetto creato: ${projectData.title}`, {
                project_id: data.id
            });

            return data;
        } catch (error) {
            console.error('Error creating project:', error);
            throw error;
        }
    }

    async updateProject(projectId, updates) {
        try {
            const { data, error } = await this.supabase
                .from('projects')
                .update(updates)
                .eq('id', projectId)
                .select()
                .single();

            if (error) throw error;

            // Log attività
            await this.logActivity('project_updated', `Progetto aggiornato: ${data.title}`, {
                project_id: projectId,
                updates: Object.keys(updates)
            });

            return data;
        } catch (error) {
            console.error('Error updating project:', error);
            throw error;
        }
    }

    // Metodi per gestione documenti
    async getDocuments(projectId = null, clientId = null) {
        try {
            let query = this.supabase
                .from('documents')
                .select(`
                    *,
                    project:projects(id, title),
                    client:profiles(id, full_name, email),
                    uploaded_by_profile:profiles(id, full_name, email)
                `);

            if (projectId) {
                query = query.eq('project_id', projectId);
            }
            if (clientId) {
                query = query.eq('client_id', clientId);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching documents:', error);
            return [];
        }
    }

    async uploadDocument(file, projectId, metadata = {}) {
        try {
            // Crea percorso file
            const fileName = `${Date.now()}-${file.name}`;
            const filePath = `${projectId}/${fileName}`;

            // Upload su Supabase Storage
            const { data: uploadData, error: uploadError } = await this.supabase.storage
                .from('project-documents')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Salva nel database
            const { data, error } = await this.supabase
                .from('documents')
                .insert({
                    project_id: projectId,
                    title: metadata.title || file.name,
                    description: metadata.description || '',
                    file_type: metadata.file_type || 'other',
                    file_path: filePath,
                    file_name: file.name,
                    file_size: file.size,
                    mime_type: file.type,
                    is_public: metadata.is_public || false,
                    uploaded_by: this.currentUser?.id
                })
                .select()
                .single();

            if (error) throw error;

            // Log attività
            await this.logActivity('document_uploaded', `Documento caricato: ${file.name}`, {
                document_id: data.id,
                project_id: projectId,
                file_size: file.size
            });

            return data;
        } catch (error) {
            console.error('Error uploading document:', error);
            throw error;
        }
    }

    async getPublicUrl(filePath) {
        try {
            const { data } = this.supabase.storage
                .from('project-documents')
                .getPublicUrl(filePath);

            return data.publicUrl;
        } catch (error) {
            console.error('Error getting public URL:', error);
            return null;
        }
    }

    async downloadDocument(documentId) {
        try {
            // Get document info
            const { data: document, error } = await this.supabase
                .from('documents')
                .select('*')
                .eq('id', documentId)
                .single();

            if (error) throw error;

            // Get signed URL
            const { data: urlData } = await this.supabase.storage
                .from('project-documents')
                .createSignedUrl(document.file_path, 60); // 60 seconds

            // Log attività
            await this.logActivity('file_downloaded', `File scaricato: ${document.file_name}`, {
                document_id: documentId,
                project_id: document.project_id
            });

            return urlData.signedUrl;
        } catch (error) {
            console.error('Error downloading document:', error);
            throw error;
        }
    }

    // Metodi per gestione messaggi
    async getMessages(projectId = null) {
        try {
            let query = this.supabase
                .from('messages')
                .select(`
                    *,
                    sender:profiles(id, full_name, email),
                    recipient:profiles(id, full_name, email)
                `);

            if (projectId) {
                query = query.eq('project_id', projectId);
            } else {
                // Solo messaggi dell'utente corrente
                query = query.or(`sender_id.eq.${this.currentUser?.id},recipient_id.eq.${this.currentUser?.id}`);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching messages:', error);
            return [];
        }
    }

    async sendMessage(messageData) {
        try {
            const { data, error } = await this.supabase
                .from('messages')
                .insert({
                    ...messageData,
                    sender_id: this.currentUser?.id
                })
                .select()
                .single();

            if (error) throw error;

            // Crea notifica per recipient
            await this.createNotification(
                messageData.recipient_id,
                'Nuovo messaggio',
                messageData.subject || 'Hai ricevuto un nuovo messaggio',
                'message_received',
                'message',
                data.id,
                `/messages/${data.id}`
            );

            // Log attività
            await this.logActivity('message_sent', `Messaggio inviato a: ${messageData.recipient_id}`, {
                message_id: data.id,
                project_id: messageData.project_id
            });

            return data;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    // Metodi per gestione task
    async getTasks(projectId = null, assignedTo = null) {
        try {
            let query = this.supabase
                .from('tasks')
                .select(`
                    *,
                    project:projects(id, title),
                    assigned_to_profile:profiles(id, full_name, email),
                    created_by_profile:profiles(id, full_name, email)
                `);

            if (projectId) {
                query = query.eq('project_id', projectId);
            }
            if (assignedTo) {
                query = query.eq('assigned_to', assignedTo);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching tasks:', error);
            return [];
        }
    }

    async createTask(taskData) {
        try {
            const { data, error } = await this.supabase
                .from('tasks')
                .insert({
                    ...taskData,
                    created_by: this.currentUser?.id
                })
                .select()
                .single();

            if (error) throw error;

            // Notifica per assigned user
            if (taskData.assigned_to) {
                await this.createNotification(
                    taskData.assigned_to,
                    'Nuovo task assegnato',
                    `Ti è stato assegnato: ${taskData.title}`,
                    'task_assigned',
                    'task',
                    data.id,
                    `/tasks/${data.id}`
                );
            }

            return data;
        } catch (error) {
            console.error('Error creating task:', error);
            throw error;
        }
    }

    // Metodi per gestione notifiche
    async getNotifications(userId = null) {
        try {
            const targetUserId = userId || this.currentUser?.id;
            if (!targetUserId) return [];

            const { data, error } = await this.supabase
                .from('notifications')
                .select('*')
                .eq('user_id', targetUserId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }
    }

    async markNotificationAsRead(notificationId) {
        try {
            const { error } = await this.supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId);

            if (error) throw error;
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async createNotification(userId, title, message, type = 'info', entityType = null, entityId = null, actionUrl = null) {
        try {
            const { error } = await this.supabase
                .from('notifications')
                .insert({
                    user_id: userId,
                    title,
                    message,
                    notification_type: type,
                    related_entity_type: entityType,
                    related_entity_id: entityId,
                    action_url
                });

            if (error) throw error;
        } catch (error) {
            console.error('Error creating notification:', error);
        }
    }

    // Metodi per log attività
    async logActivity(activityType, description, metadata = {}) {
        try {
            await this.supabase
                .from('activities')
                .insert({
                    user_id: this.currentUser?.id,
                    activity_type: activityType,
                    description,
                    metadata
                });
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }

    // Metodi per profilo utente
    async getProfile(userId = null) {
        try {
            const targetUserId = userId || this.currentUser?.id;
            if (!targetUserId) return null;

            const { data, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('user_id', targetUserId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data;
        } catch (error) {
            console.error('Error fetching profile:', error);
            return null;
        }
    }

    async updateProfile(updates) {
        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .update(updates)
                .eq('user_id', this.currentUser?.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    }

    async uploadAvatar(file) {
        try {
            const fileName = `avatar-${this.currentUser?.id}-${Date.now()}`;
            const filePath = `${this.currentUser?.id}/${fileName}`;

            // Upload su storage
            const { error: uploadError } = await this.supabase.storage
                .from('user-avatars')
                .upload(filePath, file, {
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = this.supabase.storage
                .from('user-avatars')
                .getPublicUrl(filePath);

            // Update profile
            await this.updateProfile({ avatar_url: urlData.publicUrl });

            return urlData.publicUrl;
        } catch (error) {
            console.error('Error uploading avatar:', error);
            throw error;
        }
    }

    // Helper methods
    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    async refreshSession() {
        try {
            const { data, error } = await this.supabase.auth.refreshSession();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error refreshing session:', error);
            return null;
        }
    }
}

// Inizializzazione globale
document.addEventListener('DOMContentLoaded', () => {
    window.supabaseClient = new SupabaseClient();
});

// Esporta per uso globale
window.SupabaseClient = SupabaseClient;
