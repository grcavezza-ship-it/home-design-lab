// Home Design Lab - Site JavaScript
// Funzionalità generali del sito

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        console.log('Site JS initialized');
        initMobileMenu();
        initSmoothScroll();
        initAnimations();
    });

    // Menu mobile: supporta entrambe le versioni dell'id usate nel sito.
    // Evita conflitti con public-nav.js se è già stato inizializzato.
    function initMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobile-menu-button') || document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');

        if (!mobileMenuBtn || !mobileMenu) return;
        if (mobileMenuBtn.dataset.hdlMobileMenuBound === 'true') return;

        mobileMenuBtn.dataset.hdlMobileMenuBound = 'true';
        mobileMenuBtn.type = 'button';

        const styleId = 'hdl-mobile-menu-fallback-style';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                #mobile-menu.hdl-menu-ready {
                    max-height: 0;
                    opacity: 0;
                    overflow: hidden;
                    transition: max-height .4s ease, opacity .25s ease;
                }
                #mobile-menu.hdl-menu-ready.open {
                    max-height: 600px;
                    opacity: 1;
                }
                @media (min-width: 768px) {
                    #mobile-menu.hdl-menu-ready { display: none !important; }
                }
            `;
            document.head.appendChild(style);
        }

        mobileMenu.classList.add('hdl-menu-ready');
        mobileMenu.classList.remove('hidden');

        mobileMenuBtn.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            const isOpen = mobileMenu.classList.toggle('open');
            mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
            const icon = mobileMenuBtn.querySelector('.material-symbols-outlined');
            if (icon) icon.textContent = isOpen ? 'close' : 'menu';
        });

        mobileMenu.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
                mobileMenu.classList.remove('open');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
                const icon = mobileMenuBtn.querySelector('.material-symbols-outlined');
                if (icon) icon.textContent = 'menu';
            });
        });
    }

    // Scroll smooth
    function initSmoothScroll() {
        const links = document.querySelectorAll('a[href^="#"]');

        links.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);

                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    // Animazioni base
    function initAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                }
            });
        }, observerOptions);

        const animatedElements = document.querySelectorAll('.animate-on-scroll');
        animatedElements.forEach(el => observer.observe(el));
    }

})();
