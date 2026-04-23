// Supabase Configuration
window.SUPABASE_CONFIG = {
    url: 'https://fjwcgawzjfhqzjgztfgg.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqd2NnYXd6amZocXpqZ3p0ZmdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk1NzQ0MzgsImV4cCI6MjA0NTE1MDQzOH0.qvJn-sxLr3J2i0X3xO1JdYk3m-7kXKzR0eF1bH2q0M'
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.SUPABASE_CONFIG;
}
