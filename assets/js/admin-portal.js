// Home Design Lab - Admin Portal
// Sistema completo di amministrazione senza codice

class AdminPortal {
    constructor() {
        this.supabase = null;
        this.currentSection = 'dashboard';
        this.users = [];
        this.projects = [];
        this.documents = [];
        this.messages = [];
        this.stats = {};
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.initializeSupabase();
        await this.loadDashboardData();
        this.showSection('dashboard');
    }

    async initializeSupabase() {
        console.log('Admin Portal: Starting Supabase initialization...');
        
        // Attendi che Supabase sia disponibile con retry più robusto
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 100; // 10 secondi con check ogni 100ms
            
            const checkSupabase = setInterval(() => {
                attempts++;
                
                // Controlla se Supabase è disponibile tramite supabaseClient
                if (window.supabaseClient) {
                    console.log('Admin Portal: supabaseClient found, attempt:', attempts);
                    
                    // Prova diversi metodi per ottenere il client
                    let client = null;
                    
                    // Metodo 1: window.supabaseClient.supabase
                    if (window.supabaseClient.supabase) {
                        client = window.supabaseClient.supabase;
                        console.log('Admin Portal: Using window.supabaseClient.supabase');
                    }
                    // Metodo 2: window.supabaseClient (se è direttamente il client)
                    else if (window.supabaseClient.auth && window.supabaseClient.from) {
                        client = window.supabaseClient;
                        console.log('Admin Portal: Using window.supabaseClient directly');
                    }
                    // Metodo 3: Fallback diretto a createClient
                    else if (typeof createClient !== 'undefined') {
                        client = createClient(
                            'https://amhqqszzxmrphisxlsnj.supabase.co',
                            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHFxc3p6eG1ycGhpc3hsc25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MDc1MjQsImV4cCI6MjA5MTQ4MzUyNH0.VubabSM4x4VrGF66a7lLVSDloUiVpdU_-Sofg5eYo4I'
                        );
                        console.log('Admin Portal: Using direct createClient fallback');
                    }
                    
                    if (client) {
                        this.supabase = client;
                        clearInterval(checkSupabase);
                        console.log('Admin Portal: Supabase initialized successfully');
                        
                        // Verifica che il client funzioni realmente
                        this.testSupabaseConnection().then(() => {
                            console.log('Admin Portal: Connection test passed');
                            resolve();
                        }).catch((error) => {
                            console.error('Admin Portal: Connection test failed:', error);
                            // Risolvi comunque per permettere all'utente di provare
                            resolve();
                        });
                    }
                }
                
                // Timeout dopo max attempts
                if (attempts >= maxAttempts) {
                    clearInterval(checkSupabase);
                    console.error('Admin Portal: Supabase initialization timeout after', maxAttempts, 'attempts');
                    
                    // Ultimo tentativo: crea client diretto
                    if (typeof createClient !== 'undefined') {
                        console.log('Admin Portal: Final fallback to direct createClient');
                        this.supabase = createClient(
                            'https://amhqqszzxmrphisxlsnj.supabase.co',
                            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHFxc3p6eG1ycGhpc3hsc25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MDc1MjQsImV4cCI6MjA5MTQ4MzUyNH0.VubabSM4x4VrGF66a7lLVSDloUiVpdU_-Sofg5eYo4I'
                        );
                    }
                    resolve();
                }
            }, 100);
        });
    }

    async testSupabaseConnection() {
        if (!this.supabase) {
            throw new Error('Supabase client non disponibile');
        }
        
        // Test di connessione semplice
        const { data, error } = await this.supabase
            .from('operatori_profiles')
            .select('count', { count: 'exact', head: true });
            
        if (error) {
            console.log('Admin Portal: Connection test result:', error.message);
            // Non lanciamo errore qui, potrebbe essere solo che la tabella non esiste
        } else {
            console.log('Admin Portal: Connection test successful');
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('[data-nav-section]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.dataset.navSection;
                this.showSection(section);
            });
        });

        // Logout
        document.querySelector('[data-logout]').addEventListener('click', () => {
            this.handleLogout();
        });

        // Dashboard actions
        this.setupDashboardActions();
        this.setupUsersActions();
        this.setupProjectsActions();
        this.setupDocumentsActions();
        this.setupMessagesActions();
        this.setupSettingsActions();
    }

    async showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.add('hidden');
        });

        // Show selected section
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }

        // Update navigation
        document.querySelectorAll('[data-nav-section]').forEach(link => {
            link.classList.remove('text-primary', 'border-b-2', 'border-primary', 'pb-1');
            link.classList.add('text-on-surface-variant');
        });

        const activeLink = document.querySelector(`[data-nav-section="${sectionName}"]`);
        if (activeLink) {
            activeLink.classList.remove('text-on-surface-variant');
            activeLink.classList.add('text-primary', 'border-b-2', 'border-primary', 'pb-1');
        }

        this.currentSection = sectionName;

        // Load section data
        await this.loadSectionData(sectionName);
    }

    async loadSectionData(section) {
        if (!this.supabase) return;

        try {
            switch (section) {
                case 'dashboard':
                    await this.loadDashboardData();
                    break;
                case 'users':
                    await this.loadUsersData();
                    break;
                case 'projects':
                    await this.loadProjectsData();
                    break;
                case 'documents':
                    await this.loadDocumentsData();
                    break;
                case 'messages':
                    await this.loadMessagesData();
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${section} data:`, error);
        }
    }

    async loadDashboardData() {
        try {
            // Load stats
            const [usersCount, projectsCount, documentsCount, messagesCount] = await Promise.all([
                this.supabase.from('operatori_profiles').select('count', { count: 'exact', head: true }),
                this.supabase.from('projects').select('count', { count: 'exact', head: true }),
                this.supabase.from('documents').select('count', { count: 'exact', head: true }),
                this.supabase.from('messages').select('count', { count: 'exact', head: true })
            ]);

            // Update stats UI
            this.updateStat('users', usersCount.count || 0);
            this.updateStat('projects', projectsCount.count || 0);
            this.updateStat('documents', documentsCount.count || 0);
            this.updateStat('messages', messagesCount.count || 0);

            // Load recent activity
            await this.loadRecentActivity();
            await this.loadFeaturedProjects();

        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    updateStat(statName, value) {
        const element = document.querySelector(`[data-stats-${statName}]`);
        if (element) {
            element.textContent = value;
        }
    }

    async loadRecentActivity() {
        try {
            const { data, error } = await this.supabase
                .from('activities')
                .select(`
                    *,
                    user:operatori_profiles(nome)
                `)
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) throw error;

            const activityContainer = document.querySelector('[data-recent-activity]');
            if (activityContainer && data) {
                activityContainer.innerHTML = data.map(activity => `
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <span class="material-symbols-outlined text-primary">${this.getActivityIcon(activity.activity_type)}</span>
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-medium text-on-surface">${activity.description}</p>
                            <p class="text-xs text-on-surface-variant">${activity.user?.full_name || 'Sistema'} - ${this.formatTime(activity.created_at)}</p>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
    }

    async loadFeaturedProjects() {
        try {
            const { data, error } = await this.supabase
                .from('projects')
                .select(`
                    *,
                    client:clienti_profiles(nome)
                `)
                .eq('status', 'active')
                .order('progress_percentage', { ascending: false })
                .limit(3);

            if (error) throw error;

            const projectsContainer = document.querySelector('[data-featured-projects]');
            if (projectsContainer && data) {
                projectsContainer.innerHTML = data.map(project => `
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-on-surface">${project.title}</p>
                            <p class="text-xs text-on-surface-variant">Cliente: ${project.client?.full_name || 'N/A'}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-sm font-semibold text-primary">${project.progress_percentage}%</p>
                            <p class="text-xs text-on-surface-variant">Completamento</p>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error loading featured projects:', error);
        }
    }

    getActivityIcon(activityType) {
        const icons = {
            'project_created': 'add_circle',
            'project_updated': 'edit',
            'document_uploaded': 'upload_file',
            'document_viewed': 'visibility',
            'message_sent': 'send',
            'login': 'login',
            'file_downloaded': 'download'
        };
        return icons[activityType] || 'info';
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        
        if (diffHours < 1) return 'pochi minuti fa';
        if (diffHours < 24) return `${diffHours} ore fa`;
        if (diffHours < 48) return 'ieri';
        return `${Math.floor(diffHours / 24)} giorni fa`;
    }

    setupDashboardActions() {
        // Dashboard specific actions
        // Add refresh button, export functionality, etc.
    }

    // USERS MANAGEMENT
    async loadUsersData() {
        try {
            const { data, error } = await this.supabase
                .from('operatori_profiles')
                .select(`
                    *,
                    projects_count:projects(count)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.users = data || [];
            this.renderUsersTable();
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    renderUsersTable() {
        const tableBody = document.querySelector('[data-users-table]');
        if (!tableBody) return;

        if (this.users.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-12 text-center text-on-surface-variant">
                        Nessun utente trovato
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.users.map(user => `
            <tr>
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-surface-container rounded-full overflow-hidden">
                            ${user.avatar_url ? 
                                `<img src="${user.avatar_url}" alt="${user.full_name}" class="w-full h-full object-cover">` :
                                `<div class="w-full h-full bg-primary/10 flex items-center justify-center">
                                    <span class="material-symbols-outlined text-primary text-sm">person</span>
                                </div>`
                            }
                        </div>
                        <div>
                            <p class="text-sm font-medium text-on-surface">${user.full_name || 'N/A'}</p>
                            <p class="text-xs text-on-surface-variant">${user.email}</p>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${this.getRoleBadgeClass(user.role)}">
                        ${this.getRoleLabel(user.role)}
                    </span>
                </td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${user.is_active ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}">
                        ${user.is_active ? 'Attivo' : 'Inattivo'}
                    </span>
                </td>
                <td class="px-6 py-4">
                    <p class="text-sm text-on-surface">${user.projects_count || 0}</p>
                </td>
                <td class="px-6 py-4">
                    <p class="text-xs text-on-surface-variant">${user.last_sign_in_at ? this.formatTime(user.last_sign_in_at) : 'Mai'}</p>
                </td>
                <td class="px-6 py-4">
                    <div class="flex gap-2">
                        <button class="p-1 hover:bg-surface-container rounded transition-colors" onclick="adminPortal.editUser('${user.id}')">
                            <span class="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button class="p-1 hover:bg-surface-container rounded transition-colors" onclick="adminPortal.deleteUser('${user.id}')">
                            <span class="material-symbols-outlined text-sm">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    getRoleBadgeClass(role) {
        const classes = {
            'admin': 'bg-error/10 text-error',
            'architect': 'bg-primary/10 text-primary',
            'client': 'bg-secondary/10 text-secondary'
        };
        return classes[role] || 'bg-surface-container text-on-surface-variant';
    }

    getRoleLabel(role) {
        const labels = {
            'admin': 'Admin',
            'architect': 'Architetto',
            'client': 'Cliente'
        };
        return labels[role] || role;
    }

    setupUsersActions() {
        // Add user button
        document.querySelector('[data-add-user]')?.addEventListener('click', () => {
            this.showUserModal();
        });

        // Search and filter
        document.querySelector('[data-users-search]')?.addEventListener('input', (e) => {
            this.filterUsers(e.target.value);
        });

        document.querySelector('[data-users-filter]')?.addEventListener('change', (e) => {
            this.filterUsersByRole(e.target.value);
        });
    }

    showUserModal(userId = null) {
        const user = userId ? this.users.find(u => u.id === userId) : null;
        const isEdit = !!user;

        const modalHTML = `
            <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-modal="user">
                <div class="bg-surface rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
                    <div class="p-6 border-b border-outline-variant/20">
                        <h3 class="text-xl font-semibold text-on-surface">${isEdit ? 'Modifica Utente' : 'Nuovo Utente'}</h3>
                    </div>
                    <div class="p-6">
                        <form id="user-form" class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-on-surface mb-1">Nome Completo</label>
                                <input type="text" name="full_name" value="${user?.full_name || ''}" required
                                       class="w-full px-3 py-2 border border-outline-variant/30 rounded-lg focus:outline-none focus:border-primary">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-on-surface mb-1">Email</label>
                                <input type="email" name="email" value="${user?.email || ''}" required
                                       class="w-full px-3 py-2 border border-outline-variant/30 rounded-lg focus:outline-none focus:border-primary">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-on-surface mb-1">Ruolo</label>
                                <select name="role" class="w-full px-3 py-2 border border-outline-variant/30 rounded-lg focus:outline-none focus:border-primary">
                                    <option value="client" ${user?.role === 'client' ? 'selected' : ''}>Cliente</option>
                                    <option value="architect" ${user?.role === 'architect' ? 'selected' : ''}>Architetto</option>
                                    <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Admin</option>
                                </select>
                            </div>
                            <div>
                                <label class="flex items-center">
                                    <input type="checkbox" name="is_active" ${user?.is_active !== false ? 'checked' : ''} 
                                           class="mr-2">
                                    <span class="text-sm text-on-surface">Utente attivo</span>
                                </label>
                            </div>
                            ${!isEdit ? `
                            <div>
                                <label class="block text-sm font-medium text-on-surface mb-1">Password</label>
                                <input type="password" name="password" required
                                       class="w-full px-3 py-2 border border-outline-variant/30 rounded-lg focus:outline-none focus:border-primary">
                            </div>
                            ` : ''}
                        </form>
                    </div>
                    <div class="p-6 border-t border-outline-variant/20 flex justify-end gap-3">
                        <button type="button" onclick="adminPortal.closeModal()" 
                                class="px-4 py-2 border border-outline-variant/30 rounded-lg hover:bg-surface-container transition-colors">
                            Annulla
                        </button>
                        <button type="button" onclick="adminPortal.saveUser('${userId || ''}')" 
                                class="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-secondary transition-colors">
                            ${isEdit ? 'Salva' : 'Crea'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.showModal(modalHTML);
    }

    async saveUser(userId) {
        console.log('saveUser called with userId:', userId);
        
        const form = document.getElementById('user-form');
        if (!form) {
            console.error('Form not found');
            this.showError('Form non trovato');
            return;
        }

        const formData = new FormData(form);
        
        const userData = {
            full_name: formData.get('full_name'),
            email: formData.get('email'),
            role: formData.get('role'),
            is_active: formData.has('is_active')
        };

        console.log('User data:', userData);

        try {
            // Se Supabase non è inizializzato, crealo direttamente
            if (!this.supabase) {
                console.log('Supabase not initialized, creating direct client...');
                if (typeof createClient !== 'undefined') {
                    this.supabase = createClient(
                        'https://amhqqszzxmrphisxlsnj.supabase.co',
                        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHFxc3p6eG1ycGhpc3hsc25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MDc1MjQsImV4cCI6MjA5MTQ4MzUyNH0.VubabSM4x4VrGF66a7lLVSDloUiVpdU_-Sofg5eYo4I'
                    );
                    console.log('Direct Supabase client created successfully');
                } else {
                    throw new Error('Supabase library not available');
                }
            }

            if (userId) {
                // Update existing user
                console.log('Updating existing user:', userId);
                const { error } = await this.supabase
                    .from('operatori_profiles')
                    .update(userData)
                    .eq('id', userId);

                if (error) throw error;
                window.console.log('[TestAdminUsers] User updated successfully');
            } else {
                // Create new user - approccio semplificato
                const password = formData.get('password');
                console.log('Creating new user with email:', userData.email);
                
                if (!password) {
                    throw new Error('Password richiesta per nuovi utenti');
                }

                // Usa signup normale invece di admin.createUser
                const { data: authData, error: authError } = await this.supabase.auth.signUp({
                    email: userData.email,
                    password: password,
                    options: {
                        data: {
                            full_name: userData.full_name,
                            role: userData.role
                        }
                    }
                });

                if (authError) {
                    console.error('Auth error:', authError);
                    throw authError;
                }

                console.log('Auth user created:', authData);

                // Attendi un momento per assicurarsi che il trigger crei il profilo
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Attendi un momento per assicurarsi che il trigger crei il profilo
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Verifica se il profilo è stato creato dal trigger, altrimenti crealo manualmente
                const { data: existingProfile, error: checkError } = await this.supabase
                    .from('operatori_profiles')
                    .select('id, user_id')
                    .eq('email', userData.email)
                    .maybeSingle();

                if (checkError && checkError.code === 'PGRST116') {
                    // Il profilo non esiste, crealo manualmente senza user_id per ora
                    console.log('Creating profile manually...');
                    
                    const { error: profileError } = await this.supabase
                        .from('operatori_profiles')
                        .insert({
                            email: userData.email,
                            full_name: userData.full_name,
                            role: userData.role || 'operatore'
                        });

                    if (profileError) {
                        console.error('Profile error:', profileError);
                        throw profileError;
                    }
                }

                console.log('Profile creation completed');
            }

            this.closeModal();
            await this.loadUsersData();
            this.showSuccess('Utente salvato con successo');

        } catch (error) {
            console.error('Error saving user:', error);
            console.error('Error type:', typeof error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            const errorMessage = error && error.message ? error.message : JSON.stringify(error);
            this.showError('Errore durante il salvataggio: ' + errorMessage);
        }
    }

    async deleteUser(userId) {
        if (!confirm('Sei sicuro di voler eliminare questo utente?')) return;

        try {
            const { error } = await this.supabase
                .from('operatori_profiles')
                .delete()
                .eq('id', userId);

            if (error) throw error;

            await this.loadUsersData();
            this.showSuccess('Utente eliminato con successo');

        } catch (error) {
            console.error('Error deleting user:', error);
            const errorMessage = error && error.message ? error.message : 'Errore sconosciuto';
            this.showError('Errore durante l\'eliminazione: ' + errorMessage);
        }
    }

    filterUsers(searchTerm) {
        const filtered = this.users.filter(user => 
            user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        this.renderFilteredUsers(filtered);
    }

    filterUsersByRole(role) {
        const filtered = role ? this.users.filter(user => user.role === role) : this.users;
        this.renderFilteredUsers(filtered);
    }

    renderFilteredUsers(users) {
        const originalUsers = this.users;
        this.users = users;
        this.renderUsersTable();
        this.users = originalUsers;
    }

    // PROJECTS MANAGEMENT
    async loadProjectsData() {
        try {
            const { data, error } = await this.supabase.supabase
                .from('projects')
                .select(`
                    *,
                    client:clienti_profiles(nome, email),
                    documents_count:documents(count)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.projects = data || [];
            this.renderProjectsGrid();
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    }

    renderProjectsGrid() {
        const gridContainer = document.querySelector('[data-projects-grid]');
        if (!gridContainer) return;

        if (this.projects.length === 0) {
            gridContainer.innerHTML = `
                <div class="col-span-full text-center py-12 text-on-surface-variant">
                    Nessun progetto trovato
                </div>
            `;
            return;
        }

        gridContainer.innerHTML = this.projects.map(project => `
            <div class="bg-surface-container rounded-xl border border-outline-variant/20 overflow-hidden hover:border-primary/30 transition-colors">
                <div class="h-48 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <span class="material-symbols-outlined text-4xl text-primary">architecture</span>
                </div>
                <div class="p-6">
                    <h3 class="text-lg font-semibold text-on-surface mb-2">${project.title}</h3>
                    <p class="text-sm text-on-surface-variant mb-4">${project.description || 'Nessuna descrizione'}</p>
                    
                    <div class="space-y-3">
                        <div class="flex justify-between text-sm">
                            <span class="text-on-surface-variant">Cliente:</span>
                            <span class="text-on-surface">${project.client?.full_name || 'N/A'}</span>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span class="text-on-surface-variant">Stato:</span>
                            <span class="px-2 py-1 text-xs font-medium rounded-full ${this.getStatusBadgeClass(project.status)}">
                                ${this.getStatusLabel(project.status)}
                            </span>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span class="text-on-surface-variant">Progress:</span>
                            <span class="text-on-surface">${project.progress_percentage}%</span>
                        </div>
                        <div class="w-full bg-surface-container rounded-full h-2">
                            <div class="bg-primary h-2 rounded-full transition-all duration-300" style="width: ${project.progress_percentage}%"></div>
                        </div>
                    </div>
                    
                    <div class="flex gap-2 mt-4">
                        <button class="flex-1 px-3 py-2 bg-primary text-on-primary rounded-lg hover:bg-secondary transition-colors text-sm"
                                onclick="adminPortal.editProject('${project.id}')">
                            Modifica
                        </button>
                        <button class="px-3 py-2 border border-outline-variant/30 rounded-lg hover:bg-surface-container transition-colors text-sm"
                                onclick="adminPortal.viewProject('${project.id}')">
                            Dettagli
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getStatusBadgeClass(status) {
        const classes = {
            'active': 'bg-success/10 text-success',
            'completed': 'bg-primary/10 text-primary',
            'lead': 'bg-warning/10 text-warning',
            'cancelled': 'bg-error/10 text-error',
            'on_hold': 'bg-surface-container text-on-surface-variant'
        };
        return classes[status] || 'bg-surface-container text-on-surface-variant';
    }

    getStatusLabel(status) {
        const labels = {
            'active': 'Attivo',
            'completed': 'Completato',
            'lead': 'Lead',
            'cancelled': 'Cancellato',
            'on_hold': 'In Pausa'
        };
        return labels[status] || status;
    }

    setupProjectsActions() {
        document.querySelector('[data-add-project]')?.addEventListener('click', () => {
            this.showProjectModal();
        });

        document.querySelector('[data-projects-search]')?.addEventListener('input', (e) => {
            this.filterProjects(e.target.value);
        });

        document.querySelector('[data-projects-filter]')?.addEventListener('change', (e) => {
            this.filterProjectsByStatus(e.target.value);
        });
    }

    showProjectModal(projectId = null) {
        // Implement project modal similar to user modal
        this.showInfo('Modale progetto in sviluppo');
    }

    // DOCUMENTS MANAGEMENT
    async loadDocumentsData() {
        try {
            const { data, error } = await this.supabase.supabase
                .from('documents')
                .select(`
                    *,
                    project:projects(title),
                    uploaded_by_profile:operatori_profiles(nome)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.documents = data || [];
            this.renderDocumentsTable();
        } catch (error) {
            console.error('Error loading documents:', error);
        }
    }

    renderDocumentsTable() {
        const tableBody = document.querySelector('[data-documents-table]');
        if (!tableBody) return;

        if (this.documents.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-12 text-center text-on-surface-variant">
                        Nessun documento trovato
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.documents.map(doc => `
            <tr>
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <span class="material-symbols-outlined text-primary">${this.getDocumentIcon(doc.file_type)}</span>
                        </div>
                        <div>
                            <p class="text-sm font-medium text-on-surface">${doc.title}</p>
                            <p class="text-xs text-on-surface-variant">${doc.file_name}</p>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <p class="text-sm text-on-surface">${doc.project?.title || 'N/A'}</p>
                </td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 text-xs font-medium rounded-full bg-surface-container text-on-surface-variant">
                        ${this.getDocumentTypeLabel(doc.file_type)}
                    </span>
                </td>
                <td class="px-6 py-4">
                    <p class="text-sm text-on-surface">${this.formatFileSize(doc.file_size)}</p>
                </td>
                <td class="px-6 py-4">
                    <p class="text-xs text-on-surface-variant">${this.formatTime(doc.created_at)}</p>
                </td>
                <td class="px-6 py-4">
                    <div class="flex gap-2">
                        <button class="p-1 hover:bg-surface-container rounded transition-colors" onclick="adminPortal.downloadDocument('${doc.id}')">
                            <span class="material-symbols-outlined text-sm">download</span>
                        </button>
                        <button class="p-1 hover:bg-surface-container rounded transition-colors" onclick="adminPortal.deleteDocument('${doc.id}')">
                            <span class="material-symbols-outlined text-sm">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    getDocumentIcon(fileType) {
        const icons = {
            'plan': 'architecture',
            'render': 'image',
            'photo': 'photo',
            'document': 'description',
            'contract': 'description',
            'invoice': 'receipt',
            'technical': 'build',
            'presentation': 'slideshow',
            'other': 'insert_drive_file'
        };
        return icons[fileType] || 'insert_drive_file';
    }

    getDocumentTypeLabel(fileType) {
        const labels = {
            'plan': 'Planimetria',
            'render': 'Render',
            'photo': 'Foto',
            'document': 'Documento',
            'contract': 'Contratto',
            'invoice': 'Fattura',
            'technical': 'Tecnico',
            'presentation': 'Presentazione',
            'other': 'Altro'
        };
        return labels[fileType] || fileType;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    setupDocumentsActions() {
        document.querySelector('[data-upload-document]')?.addEventListener('click', () => {
            if (window.fileUploadManager) {
                // Open file upload modal
                window.fileUploadManager.openUploadModal('all', 'Tutti i Progetti');
            }
        });
    }

    // MESSAGES MANAGEMENT
    async loadMessagesData() {
        try {
            const { data, error } = await this.supabase.supabase
                .from('messages')
                .select(`
                    *,
                    sender:operatori_profiles(nome),
                    recipient:clienti_profiles(nome)
                `)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            this.messages = data || [];
            this.renderMessagesList();
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    renderMessagesList() {
        const messagesContainer = document.querySelector('[data-messages-list]');
        if (!messagesContainer) return;

        if (this.messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="text-center py-12 text-on-surface-variant">
                    Nessun messaggio trovato
                </div>
            `;
            return;
        }

        messagesContainer.innerHTML = this.messages.map(message => `
            <div class="bg-surface-container rounded-xl p-6 border border-outline-variant/20">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h4 class="font-semibold text-on-surface">${message.subject || 'Nessun oggetto'}</h4>
                        <p class="text-sm text-on-surface-variant">
                            Da: ${message.sender?.full_name || 'Sistema'} a ${message.recipient?.full_name || 'N/A'}
                        </p>
                    </div>
                    <span class="text-xs text-on-surface-variant">${this.formatTime(message.created_at)}</span>
                </div>
                <p class="text-on-surface mb-4">${message.content}</p>
                <div class="flex gap-2">
                    <button class="px-3 py-1 bg-primary text-on-primary rounded-lg hover:bg-secondary transition-colors text-sm">
                        Rispondi
                    </button>
                    <button class="px-3 py-1 border border-outline-variant/30 rounded-lg hover:bg-surface-container transition-colors text-sm">
                        Archivia
                    </button>
                </div>
            </div>
        `).join('');
    }

    setupMessagesActions() {
        // Messages specific actions
    }

    // SETTINGS MANAGEMENT
    setupSettingsActions() {
        document.querySelectorAll('[data-settings-tab]').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.settingsTab;
                this.showSettingsTab(tabName);
            });
        });
    }

    showSettingsTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('[data-settings-tab]').forEach(tab => {
            tab.classList.remove('text-primary', 'border-b-2', 'border-primary', 'pb-1');
            tab.classList.add('text-on-surface-variant');
        });

        const activeTab = document.querySelector(`[data-settings-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.remove('text-on-surface-variant');
            activeTab.classList.add('text-primary', 'border-b-2', 'border-primary', 'pb-1');
        }

        // Show tab content (implement different tab contents)
        const contentContainer = document.getElementById('settings-content');
        if (contentContainer) {
            // Load different content based on tab
            this.loadSettingsContent(tabName);
        }
    }

    loadSettingsContent(tabName) {
        // Implement different settings tab contents
        console.log('Loading settings tab:', tabName);
    }

    // UTILITY METHODS
    showModal(html) {
        const container = document.getElementById('modals-container');
        if (container) {
            container.innerHTML = html;
        }
    }

    closeModal() {
        const container = document.getElementById('modals-container');
        if (container) {
            container.innerHTML = '';
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type = 'info') {
        // Crea elemento notifica
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 ${
            type === 'success' ? 'bg-success text-white' :
            type === 'error' ? 'bg-error text-white' :
            'bg-primary text-white'
        }`;
        
        notification.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="material-symbols-outlined">
                    ${type === 'success' ? 'check_circle' :
                      type === 'error' ? 'error' :
                      'info'}
                </span>
                <p class="text-sm font-medium">${message}</p>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-auto">
                    <span class="material-symbols-outlined text-sm">close</span>
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto rimuovi dopo 5 secondi
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    async handleLogout() {
        if (confirm('Sei sicuro di voler uscire?')) {
            if (this.supabase) {
                await this.supabase.signOut();
            }
            window.location.href = 'login.html';
        }
    }
}

// Inizializzazione globale
document.addEventListener('DOMContentLoaded', () => {
    window.adminPortal = new AdminPortal();
});

// Esporta per uso globale
window.AdminPortal = AdminPortal;
