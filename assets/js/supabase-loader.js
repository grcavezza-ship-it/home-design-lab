/**
 * Supabase Loader - Sistema di caricamento robusto con fallback multi-CDN
 * Garantisce che createClient sia sempre disponibile
 */

(function() {
    'use strict';
    
    // Lista di CDN per fallback
    const cdnSources = [
        {
            url: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.7/dist/umd/index.js',
            name: 'jsdelivr'
        },
        {
            url: 'https://unpkg.com/@supabase/supabase-js@2.39.7/dist/umd/index.js',
            name: 'unpkg'
        },
        {
            url: 'https://cdnjs.cloudflare.com/ajax/libs/supabase-js/2.39.7/umd/index.js',
            name: 'cloudflare'
        }
    ];
    
    let currentSourceIndex = 0;
    let loadAttempts = 0;
    const maxAttempts = 3;
    
    // Funzione per caricare script
    function loadScript(source, callback) {
        const script = document.createElement('script');
        script.src = source.url;
        script.async = true;
        
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
        return typeof window.createClient !== 'undefined';
    }
    
    // Funzione principale di caricamento
    function loadSupabase() {
        loadAttempts++;
        
        if (checkCreateClient()) {
            console.log('Supabase createClient is already available');
            return;
        }
        
        if (currentSourceIndex >= cdnSources.length) {
            if (loadAttempts >= maxAttempts) {
                console.error('Failed to load Supabase from all CDN sources');
                // Carica il fallback locale
                loadLocalFallback();
                return;
            }
            currentSourceIndex = 0;
        }
        
        const source = cdnSources[currentSourceIndex];
        
        loadScript(source, function(success) {
            if (success && checkCreateClient()) {
                console.log('Supabase loaded successfully');
                // Esponi globalmente per compatibilità
                window.SupabaseClient = window.createClient;
            } else {
                currentSourceIndex++;
                setTimeout(loadSupabase, 1000);
            }
        });
    }
    
    // Funzione per caricare il fallback locale
    function loadLocalFallback() {
        console.log('Loading local Supabase fallback...');
        
        const fallbackScript = document.createElement('script');
        fallbackScript.src = 'assets/js/supabase-fallback.js';
        fallbackScript.async = true;
        
        fallbackScript.onload = function() {
            console.log('Local Supabase fallback loaded successfully');
            if (checkCreateClient()) {
                window.SupabaseClient = window.createClient;
            }
        };
        
        fallbackScript.onerror = function() {
            console.error('Failed to load local fallback');
            // Ultima risorsa: crea un mock base
            window.createClient = function() {
                throw new Error('Supabase library failed to load completely. Please check your internet connection and try again.');
            };
        };
        
        document.head.appendChild(fallbackScript);
    }
    
    // Avvia il caricamento
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadSupabase);
    } else {
        loadSupabase();
    }
    
    // Esponi funzione per ricaricare manualmente se necessario
    window.reloadSupabase = loadSupabase;
    
})();
