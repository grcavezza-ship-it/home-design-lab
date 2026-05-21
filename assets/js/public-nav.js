(() => {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    if (!mobileMenuButton || !mobileMenu) return;

    const setIcon = () => {
      const icon = mobileMenuButton.querySelector('.material-symbols-outlined');
      if (!icon) return;
      icon.textContent = mobileMenu.classList.contains('hidden') ? 'menu' : 'close';
    };

    mobileMenuButton.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
      setIcon();
    });

    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
        setIcon();
      });
    });

    setIcon();
  });
})();
