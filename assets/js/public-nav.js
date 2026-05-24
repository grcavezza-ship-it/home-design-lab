(() => {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const menu = document.getElementById('mobile-menu');
    const btn = document.getElementById('mobile-menu-button');
    if (!menu || !btn) return;

    const style = document.createElement('style');
    style.textContent = `
      #mobile-menu {
        max-height: 0;
        opacity: 0;
        overflow: hidden;
        transition: max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease;
      }
      #mobile-menu.open {
        max-height: 480px;
        opacity: 1;
      }
      #mobile-menu.open > div > a {
        opacity: 0;
        animation: mobileLinkFade 0.3s ease forwards;
      }
      #mobile-menu.open > div > a:nth-child(1) { animation-delay: 0.05s; }
      #mobile-menu.open > div > a:nth-child(2) { animation-delay: 0.10s; }
      #mobile-menu.open > div > a:nth-child(3) { animation-delay: 0.15s; }
      #mobile-menu.open > div > a:nth-child(4) { animation-delay: 0.20s; }
      #mobile-menu.open > div > a:nth-child(5) { animation-delay: 0.25s; }
      #mobile-menu.open > div > a:nth-child(6) { animation-delay: 0.30s; }
      #mobile-menu.open > div > a:nth-child(7) { animation-delay: 0.35s; }
      @keyframes mobileLinkFade {
        from { opacity: 0; transform: translateY(-8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @media (min-width: 768px) {
        #mobile-menu { display: none !important; }
      }
    `;
    document.head.appendChild(style);

    menu.classList.remove('hidden');

    var overlay = document.getElementById('mobile-menu-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'mobile-menu-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.25);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);z-index:40;opacity:0;transition:opacity 0.35s ease;pointer-events:none;';
      document.body.appendChild(overlay);
    }

    function openMenu() {
      menu.classList.add('open');
      overlay.style.opacity = '1';
      overlay.style.pointerEvents = 'auto';
      document.body.style.overflow = 'hidden';
      var icon = btn.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = 'close';
    }

    function closeMenu() {
      menu.classList.remove('open');
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
      document.body.style.overflow = '';
      var icon = btn.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = 'menu';
    }

    btn.addEventListener('click', function() {
      if (menu.classList.contains('open')) closeMenu();
      else openMenu();
    });

    overlay.addEventListener('click', closeMenu);

    menu.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', closeMenu);
    });

    var resizeTimer;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function() {
        if (window.innerWidth >= 768) closeMenu();
      }, 100);
    });
  });
})();
