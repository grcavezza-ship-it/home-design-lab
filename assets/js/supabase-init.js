// Supabase Initialization
(function() {
    'use strict';

    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Initializing Supabase...');
        
        // Configuration
        const SUPABASE_URL = 'https://fjwcgawzjfhqzjgztfgg.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqd2NnYXd6amZocXpqZ3p0ZmdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk1NzQ0MzgsImV4cCI6MjA0NTE1MDQzOH0.qvJn-sxLr3J2i0X3xO1JdYk3m-7kXKzR0eF1bH2q0M';

        // Initialize global Supabase client
        try {
            if (window.supabase && window.supabase.createClient) {
                window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                window.supabaseClient.isInitialized = true;
                console.log('Supabase initialized successfully');
            } else {
                console.error('Supabase library not loaded');
            }
        } catch (error) {
            console.error('Failed to initialize Supabase:', error);
        }
    });

})();
