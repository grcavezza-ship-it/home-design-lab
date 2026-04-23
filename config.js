// Configurazione sicura - NON committare in Git
// Questo file genera le configurazioni da environment variables

const CONFIG = {
    // Supabase Configuration
    SUPABASE: {
        URL: process.env.SUPABASE_URL || 'https://amhqqszzxmrphisxlsnj.supabase.co',
        ANON_KEY: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHFxc3p6eG1ycGhpc3hsc25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MDc1MjQsImV4cCI6MjA5MTQ4MzUyNH0.VubabSM4x4VrGF66a7lLVSDloUiVpdU_-Sofg5eYo4I',
        SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    },
    
    // API Configuration
    API: {
        BASE_URL: process.env.API_BASE_URL || 'http://localhost:5000',
        TIMEOUT: parseInt(process.env.API_TIMEOUT) || 10000
    },
    
    // App Configuration
    APP: {
        NAME: 'Home Design Lab',
        VERSION: '1.0.0',
        ENVIRONMENT: process.env.NODE_ENV || 'development',
        DEBUG: process.env.NODE_ENV === 'development'
    },
    
    // Storage Configuration
    STORAGE: {
        BUCKET: process.env.STORAGE_BUCKET || 'project-documents',
        MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
        ALLOWED_TYPES: process.env.ALLOWED_TYPES?.split(',') || ['image/jpeg', 'image/png', 'application/pdf']
    },
    
    // Google Drive Configuration
    GOOGLE_DRIVE: {
        CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '868696338926-c9fjvukoma6b5m7q7n4mhe28ba2a2kqm.apps.googleusercontent.com',
        API_KEY: process.env.GOOGLE_API_KEY || 'AIzaSyAxiHSy7EcdatxkQjnRTbSRGn5oV60jBZs',
        SCOPES: ['https://www.googleapis.com/auth/drive.readonly']
    }
};

// Export per uso in altri file
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}
