/**
 * Supabase Loader V2 - Sistema di caricamento migliorato
 * Prioritizza il vero Supabase e riduce l'uso del fallback
 */

(function() {
    'use strict';
    
    // Lista di CDN per fallback con versioni multiple
    const cdnSources = [
        {
            url: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.7/dist/umd/index.js',
            name: 'jsdelivr'
        },
        {
            url: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.7/dist/umd/index.js',
            name: 'jsdelivr-alt'
        },
        {
            url: 'https://unpkg.com/@supabase/supabase-js@2.39.7/dist/umd/index.js',
            name: 'unpkg'
        },
        {
            url: 'https://cdnjs.cloudflare.com/ajax/libs/supabase-js/2.39.7/umd/index.js',
            name: 'cloudflare'
        },
        {
            url: 'https://unpkg.com/@supabase/supabase-js@2.39.7/dist/umd/index.js',
            name: 'unpkg-bundle'
        }
    ];
    
    let currentSourceIndex = 0;
    let loadAttempts = 0;
    const maxAttempts = 5; // Aumentato a 5 tentativi
    
    // Funzione per caricare script
    function loadScript(source, callback) {
        const script = document.createElement('script');
        script.src = source.url;
        script.async = true;
        script.crossOrigin = 'anonymous';
        
        script.onload = function() {
            console.log(`Supabase loaded from ${source.name}`);
            callback(true);
        };
        
        script.onerror = function() {
            console.error(`Failed to load Supabase from ${source.name}`);
            callback(false);
        };
        
        document.head.appendChild(script);
    }
    
    // Funzione per verificare se createClient è disponibile
    function checkCreateClient() {
        return typeof window.createClient !== 'undefined' && 
               typeof window.SupabaseClient !== 'undefined';
    }
    
    // Funzione per attendere che createClient sia disponibile
    function waitForCreateClient(timeout = 3000) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            
            function check() {
                if (checkCreateClient()) {
                    resolve(true);
                } else if (Date.now() - startTime > timeout) {
                    resolve(false);
                } else {
                    setTimeout(check, 100);
                }
            }
            
            check();
        });
    }
    
    // Funzione principale di caricamento
    async function loadSupabase() {
        loadAttempts++;
        
        console.log(`Loading Supabase attempt ${loadAttempts}/${maxAttempts}`);
        
        if (checkCreateClient()) {
            console.log('Supabase createClient is already available');
            return;
        }
        
        if (currentSourceIndex >= cdnSources.length) {
            if (loadAttempts >= maxAttempts) {
                console.error('Failed to load Supabase from all CDN sources after multiple attempts');
                loadLocalFallback();
                return;
            }
            // Riprova dall'inizio con più tentativi
            currentSourceIndex = 0;
        }
        
        const source = cdnSources[currentSourceIndex];
        
        loadScript(source, async function(success) {
            if (success) {
                // Attendi che la libreria sia completamente caricata
                const isReady = await waitForCreateClient(2000);
                if (isReady) {
                    console.log('Supabase loaded successfully and is ready');
                    window.SupabaseClient = window.createClient;
                } else {
                    console.warn('Supabase loaded but createClient not available, trying next source');
                    currentSourceIndex++;
                    setTimeout(loadSupabase, 500);
                }
            } else {
                currentSourceIndex++;
                setTimeout(loadSupabase, 500);
            }
        });
    }
    
    // Funzione per caricare il fallback locale
    function loadLocalFallback() {
        console.warn('Loading local Supabase fallback as last resort');
        
        const fallbackScript = document.createElement('script');
        fallbackScript.src = 'assets/js/supabase-fallback.js';
        fallbackScript.async = true;
        
        fallbackScript.onload = function() {
            console.warn('Local Supabase fallback loaded - functionality will be limited');
            if (checkCreateClient()) {
                window.SupabaseClient = window.createClient;
            }
        };
        
        fallbackScript.onerror = function() {
            console.error('Failed to load local fallback - creating minimal mock');
            // Ultima risorsa: crea un mock base
            window.createClient = function() {
                throw new Error('Supabase library failed to load completely. Please check your internet connection and refresh the page.');
            };
        };
        
        document.head.appendChild(fallbackScript);
    }
    
    // Funzione per verificare se stiamo usando il fallback
    window.isUsingFallback = function() {
        return window.createClient && window.createClient.toString().includes('Using local Supabase fallback');
    };
    
    // Avvia il caricamento
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadSupabase);
    } else {
        loadSupabase();
    }
    
    // Esponi funzione per ricaricare manualmente se necessario
    window.reloadSupabase = loadSupabase;
    
})();
