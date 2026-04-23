// Config Loader - Carica le configurazioni in modo sicuro
class ConfigLoader {
    constructor() {
        this.config = null;
        this.loadConfig();
    }
    
    async loadConfig() {
        try {
            // In produzione, le configurazioni vengono dal backend
            if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                const response = await fetch('/api/config');
                if (response.ok) {
                    this.config = await response.json();
                    return;
                }
            }
            
            // In sviluppo, usa le configurazioni predefinite
            this.config = {
                SUPABASE_URL: 'https://amhqqszzxmrphisxlsnj.supabase.co',
                SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHFxc3p6eG1ycGhpc3hsc25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MDc1MjQsImV4cCI6MjA5MTQ4MzUyNH0.VubabSM4x4VrGF66a7lLVSDloUiVpdU_-Sofg5eYo4I',
                API_BASE_URL: window.location.origin,
                STORAGE_BUCKET: 'project-documents',
                MAX_FILE_SIZE: 10485760,
                ALLOWED_TYPES: ['image/jpeg', 'image/png', 'application/pdf']
            };
            
            console.log('Config loaded successfully');
        } catch (error) {
            console.error('Failed to load config:', error);
            this.config = {};
        }
    }
    
    get(key) {
        return this.config?.[key];
    }
    
    getAll() {
        return this.config;
    }
}

// Crea istanza globale
window.configLoader = new ConfigLoader();
