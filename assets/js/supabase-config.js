(function () {
    async function loadRuntimeConfig() {
        // Usa configurazione diretta invece di chiamare API
        window.SUPABASE_CONFIG = {
            url: 'https://amhqqszzxmrphisxlsnj.supabase.co',
            anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHFxc3p6eG1ycGhpc3hsc25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MDc1MjQsImV4cCI6MjA5MTQ4MzUyNH0.VubabSM4x4VrGF66a7lLVSDloUiVpdU_-Sofg5eYo4I',
            apiBasePath: '/api'
        };

        window.dispatchEvent(new CustomEvent('hdl:config-ready', { detail: window.SUPABASE_CONFIG }));
        return window.SUPABASE_CONFIG;
    }

    window.loadRuntimeConfig = loadRuntimeConfig;
})();
