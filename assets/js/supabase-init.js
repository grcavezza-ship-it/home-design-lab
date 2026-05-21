(function () {
    async function initSupabase() {
        try {
            const runtimeConfig = window.SUPABASE_CONFIG || await window.loadRuntimeConfig();

            if (!window.supabase || !window.supabase.createClient) {
                throw new Error('Libreria Supabase non caricata');
            }

            window.supabaseClient = window.supabase.createClient(runtimeConfig.url, runtimeConfig.anonKey);
            window.supabaseClient.isInitialized = true;
            window.dispatchEvent(new CustomEvent('hdl:supabase-ready', { detail: window.supabaseClient }));
        } catch (error) {
            console.error('Supabase init error:', error);
        }
    }

    document.addEventListener('DOMContentLoaded', initSupabase);
})();
