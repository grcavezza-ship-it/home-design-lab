// Home Design Lab - Authentication System
// Sistema di autenticazione per area clienti con Supabase

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.isLoggedIn = false;
        this.supabase = null;
        this.init();
    }

    async init() {
        // Wait for Supabase to be available
        await this.waitForSupabase();
        this.setupAuthListener();
        this.checkAuthStatus();
        this.setupLoginForm();
        this.setupLogout();
        this.updateUI();
    }

    async waitForSupabase() {
        const maxWait = 5000; // 5 seconds
        const startTime = Date.now();
        
        while (!window.supabaseClient && (Date.now() - startTime) < maxWait) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (window.supabaseClient && window.supabaseClient.isInitialized) {
            this.supabase = window.supabaseClient;
            console.log('AuthSystem: Supabase client available');
        } else {
            console.error('AuthSystem: Supabase client not available');
        }
    }

    setupAuthListener() {
        if (!this.supabase) return;

        this.supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event, session?.user?.email);
            
            if (event === 'SIGNED_IN') {
                this.currentUser = session.user;
                this.isLoggedIn = true;
                await this.loadUserProfile();
                this.updateUI();
                this.redirectToDashboard();
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.isLoggedIn = false;
                this.updateUI();
                this.redirectToHome();
            }
        });
    }

    async checkAuthStatus() {
        if (!this.supabase) return;

        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            
            if (session) {
                this.currentUser = session.user;
                this.isLoggedIn = true;
                await this.loadUserProfile();
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
        }
    }

    async loadUserProfile() {
        if (!this.currentUser || !this.supabase) return;

        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error loading profile:', error);
                return;
            }

            if (data) {
                this.currentUser.profile = data;
                console.log('Profile loaded:', data);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }

    setupLoginForm() {
        const loginForm = document.getElementById('site-login-form');
        if (!loginForm) return;

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });

        // Setup password toggle
        this.setupPasswordToggle();
    }

    setupPasswordToggle() {
        const passwordToggle = document.getElementById('site-login-password-toggle');
        const passwordInput = document.getElementById('site-login-password');
        
        if (passwordToggle && passwordInput) {
            passwordToggle.addEventListener('click', () => {
                const isPassword = passwordInput.type === 'password';
                passwordInput.type = isPassword ? 'text' : 'password';
                passwordToggle.textContent = isPassword ? 'visibility_off' : 'visibility';
            });

            // Also handle keyboard interaction
            passwordToggle.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    passwordToggle.click();
                }
            });
        }
    }

    async handleLogin() {
        if (!this.supabase) {
            this.showError('Sistema non disponibile. Riprova più tardi.');
            return;
        }

        const email = document.getElementById('site-login-email')?.value;
        const password = document.getElementById('site-login-password')?.value;

        if (!email || !password) {
            this.showError('Email e password sono richiesti.');
            return;
        }

        try {
            this.showLoading(true);

            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                throw error;
            }

            console.log('Login successful:', data.user.email);
            this.showSuccess('Login effettuato con successo!');

        } catch (error) {
            console.error('Login error:', error);
            this.showError('Credenziali non valide. Riprova.');
        } finally {
            this.showLoading(false);
        }
    }

    setupLogout() {
        const logoutButtons = document.querySelectorAll('[data-action="logout"]');
        logoutButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.handleLogout();
            });
        });
    }

    async handleLogout() {
        if (!this.supabase) return;

        try {
            await this.supabase.auth.signOut();
            console.log('Logout successful');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    updateUI() {
        // Update login/logout buttons
        const loginButtons = document.querySelectorAll('[data-action="login"]');
        const logoutButtons = document.querySelectorAll('[data-action="logout"]');
        const userElements = document.querySelectorAll('[data-user-info]');

        if (this.isLoggedIn && this.currentUser) {
            // Show user info, hide login buttons
            loginButtons.forEach(btn => btn.style.display = 'none');
            logoutButtons.forEach(btn => btn.style.display = 'block');
            
            userElements.forEach(element => {
                element.textContent = this.currentUser.profile?.full_name || this.currentUser.email;
                element.style.display = 'block';
            });

        } else {
            // Show login buttons, hide user info
            loginButtons.forEach(btn => btn.style.display = 'block');
            logoutButtons.forEach(btn => btn.style.display = 'none');
            userElements.forEach(element => element.style.display = 'none');
        }
    }

    redirectToDashboard() {
        if (window.location.pathname !== '/dashboard.html') {
            window.location.href = 'dashboard.html';
        }
    }

    redirectToHome() {
        if (window.location.pathname !== '/index.html') {
            window.location.href = 'index.html';
        }
    }

    showLoading(show) {
        const submitButton = document.querySelector('#site-login-form button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = show;
            submitButton.textContent = show ? 'Accesso...' : 'Accedi';
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existing = document.querySelector('.auth-notification');
        if (existing) existing.remove();

        // Create notification
        const notification = document.createElement('div');
        notification.className = `auth-notification fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 ${
            type === 'error' ? 'bg-error text-white' :
            type === 'success' ? 'bg-success text-white' :
            'bg-primary text-white'
        }`;
        
        notification.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="material-symbols-outlined">
                    ${type === 'error' ? 'error' :
                      type === 'success' ? 'check_circle' :
                      'info'}
                </span>
                <p class="text-sm font-medium">${message}</p>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-auto">
                    <span class="material-symbols-outlined text-sm">close</span>
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}

// Dashboard Manager
class DashboardManager {
    constructor() {
        this.currentUser = null;
        this.supabase = null;
        this.init();
    }

    async init() {
        // Wait for Supabase to be available
        await this.waitForSupabase();
        await this.checkAuth();
        this.loadDashboardData();
        this.setupEventListeners();
    }

    async waitForSupabase() {
        const maxWait = 5000;
        const startTime = Date.now();
        
        while (!window.supabaseClient && (Date.now() - startTime) < maxWait) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (window.supabaseClient && window.supabaseClient.isInitialized) {
            this.supabase = window.supabaseClient.supabase;
        }
    }

    async checkAuth() {
        if (!this.supabase) {
            window.location.href = 'login.html';
            return;
        }

        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            
            if (!session) {
                window.location.href = 'login.html';
                return;
            }

            this.currentUser = session.user;
            await this.loadUserProfile();
        } catch (error) {
            console.error('Auth check error:', error);
            window.location.href = 'login.html';
        }
    }

    async loadUserProfile() {
        if (!this.currentUser || !this.supabase) return;

        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .single();

            if (!error && data) {
                this.currentUser.profile = data;
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }

    async loadDashboardData() {
        if (!this.currentUser || !this.supabase) return;

        try {
            // Load user projects
            const { data: projects, error: projectsError } = await this.supabase
                .from('projects')
                .select('*')
                .eq('client_id', this.currentUser.id)
                .order('created_at', { ascending: false });

            if (!projectsError && projects) {
                this.renderProjects(projects);
            }

            // Load user documents
            const { data: documents, error: documentsError } = await this.supabase
                .from('documents')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .order('created_at', { ascending: false });

            if (!documentsError && documents) {
                this.renderDocuments(documents);
            }

        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    renderProjects(projects) {
        const projectsContainer = document.querySelector('[data-projects-container]');
        if (!projectsContainer) return;

        if (projects.length === 0) {
            projectsContainer.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-on-surface-variant">Nessun progetto trovato</p>
                </div>
            `;
            return;
        }

        projectsContainer.innerHTML = projects.map(project => `
            <div class="bg-surface-container rounded-lg p-6 border border-outline-variant/20">
                <h3 class="text-lg font-semibold text-on-surface mb-2">${project.title}</h3>
                <p class="text-sm text-on-surface-variant mb-4">${project.description || 'Nessuna descrizione'}</p>
                <div class="flex justify-between items-center">
                    <span class="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                        ${project.status || 'In corso'}
                    </span>
                    <span class="text-sm text-on-surface">${project.progress_percentage || 0}%</span>
                </div>
            </div>
        `).join('');
    }

    renderDocuments(documents) {
        const documentsContainer = document.querySelector('[data-documents-container]');
        if (!documentsContainer) return;

        if (documents.length === 0) {
            documentsContainer.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-on-surface-variant">Nessun documento trovato</p>
                </div>
            `;
            return;
        }

        documentsContainer.innerHTML = documents.map(doc => `
            <div class="bg-surface-container rounded-lg p-4 border border-outline-variant/20">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <span class="material-symbols-outlined text-primary">description</span>
                        <div>
                            <p class="text-sm font-medium text-on-surface">${doc.name}</p>
                            <p class="text-xs text-on-surface-variant">${this.formatDate(doc.created_at)}</p>
                        </div>
                    </div>
                    <button class="p-2 hover:bg-surface rounded-lg transition-colors">
                        <span class="material-symbols-outlined text-sm">download</span>
                    </button>
                </div>
            </div>
        `).join('');
    }

    setupEventListeners() {
        // Logout button
        const logoutButton = document.querySelector('[data-action="logout"]');
        if (logoutButton) {
            logoutButton.addEventListener('click', async () => {
                if (this.supabase) {
                    await this.supabase.auth.signOut();
                }
            });
        }
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('it-IT');
    }
}

// Initialize systems
document.addEventListener('DOMContentLoaded', () => {
    // Initialize auth system
    if (document.getElementById('site-login-form') || document.querySelector('[data-action="login"]')) {
        window.authSystem = new AuthSystem();
    }

    // Initialize dashboard
    if (document.querySelector('[data-dashboard]')) {
        window.dashboardManager = new DashboardManager();
    }
});
