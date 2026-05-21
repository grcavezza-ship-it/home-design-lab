// Home Design Lab - Site JavaScript
// Funzionalità generali del sito
// ─── Anticopia e antisniffing ──────────────────────────────────────────────────
(function() {
    'use strict';

    // Previeni click destro
    document.addEventListener('contextmenu', function(e) { e.preventDefault(); });

    // Previeni tasti sviluppatore
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) || (e.ctrlKey && e.key === 'u' || e.key === 'U')) {
            e.preventDefault();
        }
    });

    // Previeni selezione testo
    document.addEventListener('copy', function(e) { e.preventDefault(); });
    document.addEventListener('cut', function(e) { e.preventDefault(); });
    document.addEventListener('selectstart', function(e) { e.preventDefault(); });

    // Inietta JSON-LD structured data
    var script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Home Design Lab',
        url: 'https://www.homedesignlab.it',
        logo: 'https://www.homedesignlab.it/assets/images/Logo%20Home%20Design%20Lab.png',
        address: { '@type': 'PostalAddress', streetAddress: 'Via Mulimento, 23', addressLocality: 'Cicciano', addressRegion: 'NA', postalCode: '80033', addressCountry: 'IT' },
        contactPoint: { '@type': 'ContactPoint', email: 'info@homedesignlab.it', contactType: 'customer service' },
        sameAs: ['https://www.instagram.com/homedesignlab.official/']
    });
    document.head.appendChild(script);

    // Google Search Console verification
    var gsc = document.createElement('meta');
    gsc.name = 'google-site-verification';
    gsc.content = 'YOUR_VERIFICATION_CODE';
    document.head.appendChild(gsc);

    // Inizializzazione quando il DOM è pronto
    document.addEventListener('DOMContentLoaded', function() {
        initMobileMenu();
        initSmoothScroll();
        initAnimations();
    });

    // Menu mobile
    function initMobileMenu() {
        var btn = document.getElementById('mobile-menu-btn') || document.getElementById('mobile-menu-button');
        var menu = document.getElementById('mobile-menu');
        if (btn && menu) {
            btn.addEventListener('click', function() { menu.classList.toggle('hidden'); });
        }
    }

    // Scroll smooth
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                var target = document.getElementById(this.getAttribute('href').substring(1));
                if (target) target.scrollIntoView({ behavior: 'smooth' });
            });
        });
    }

    // Animazioni base
    function initAnimations() {
        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) entry.target.classList.add('fade-in');
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
        document.querySelectorAll('.animate-on-scroll').forEach(function(el) { observer.observe(el); });
    }
})();
