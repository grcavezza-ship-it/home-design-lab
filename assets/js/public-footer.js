(function() {
  'use strict';

  var FOOTER_HTML = [
    '<footer id="public-footer" class="bg-[#0d4a22] text-white/80 pt-20 pb-8 px-6 md:px-12">',
    '<div class="max-w-7xl mx-auto">',
    '<div class="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">',
    '<div class="md:col-span-4 flex flex-col gap-5">',
    '<img src="assets/images/Logo Home Design Lab.png" alt="Home Design Lab" class="w-36 h-auto brightness-0 invert">',
    '<p class="text-white/50 text-sm leading-relaxed max-w-xs">Uno studio di architettura e interior design fondato sulla sintesi tra precisione tecnica e calore domestico.</p>',
    '<div class="flex gap-3 mt-2">',
    '<a href="https://www.instagram.com/homedesignlab.official/" target="_blank" rel="noopener noreferrer" class="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 hover:text-white transition-colors" aria-label="Instagram">',
    '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>',
    '</a>',
    '</div>',
    '</div>',
    '<div class="md:col-span-2 flex flex-col gap-4">',
    '<span class="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold">Studio</span>',
    '<a href="chi-siamo.html" class="text-sm text-white/60 hover:text-white transition-colors">Chi Siamo</a>',
    '<a href="servizi-lab.html" class="text-sm text-white/60 hover:text-white transition-colors">Servizi Lab</a>',
    '<a href="collection.html" class="text-sm text-white/60 hover:text-white transition-colors">Collection</a>',
    '<a href="portfolio.html" class="text-sm text-white/60 hover:text-white transition-colors">Portfolio</a>',
    '<a href="journal.html" class="text-sm text-white/60 hover:text-white transition-colors">Journal</a>',
    '</div>',
    '<div class="md:col-span-3 flex flex-col gap-4">',
    '<span class="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold">Contatti</span>',
    '<div class="flex items-start gap-3">',
    '<span class="material-symbols-outlined text-white/40 text-[16px] mt-0.5">location_on</span>',
    '<p class="text-sm text-white/60">Via Mulimento, 23<br>Cicciano (NA) - 80033</p>',
    '</div>',
    '<div class="flex items-center gap-3">',
    '<span class="material-symbols-outlined text-white/40 text-[16px]">mail</span>',
    '<a href="mailto:info@homedesignlab.it" class="text-sm text-white/60 hover:text-white transition-colors">info@homedesignlab.it</a>',
    '</div>',
    '<p class="text-xs text-white/30 mt-1">P.IVA 03015780640</p>',
    '</div>',
    '<div class="md:col-span-3 flex flex-col gap-4">',
    '<span class="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold">Link Utili</span>',
    '<a href="contatti.html" class="text-sm text-white/60 hover:text-white transition-colors">Contattaci</a>',
    '<a href="privacy.html" class="text-sm text-white/60 hover:text-white transition-colors">Privacy Policy</a>',
    '<a href="termini.html" class="text-sm text-white/60 hover:text-white transition-colors">Termini e Condizioni</a>',
    '</div>',
    '</div>',
    '<div class="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">',
    '<p class="text-white/30 text-[10px] uppercase tracking-[0.2em] font-medium">&copy; 2025 Home Design Lab. Tutti i diritti riservati.</p>',
    '</div>',
    '</div>',
    '</footer>'
  ].join('\n');

  var COOKIE_HTML = [
    '<div id="cookie-consent" class="fixed bottom-0 left-0 right-0 z-50 bg-[#0d4a22] border-t border-white/10 p-4 md:px-8 hidden" style="box-shadow: 0 -4px 20px rgba(0,0,0,0.3);">',
    '<div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">',
    '<p class="text-sm text-white/70 text-center md:text-left">Questo sito utilizza cookie tecnici necessari al funzionamento. Continuando la navigazione accetti l\'utilizzo dei cookie. <a href="privacy.html" class="text-white underline hover:text-white/80">Maggiori informazioni</a>.</p>',
    '<button onclick="acceptCookies()" class="flex-shrink-0 px-6 py-2.5 bg-white/15 text-white text-sm font-bold rounded-lg hover:bg-white/25 transition whitespace-nowrap">Accetta</button>',
    '</div>',
    '</div>'
  ].join('\n');

  function injectFooter() {
    var root = document.getElementById('public-footer-root');
    if (!root) return;

    var temp = document.createElement('div');
    temp.innerHTML = FOOTER_HTML;
    root.parentNode.replaceChild(temp.firstElementChild, root);
  }

  function injectCookieConsent() {
    if (getCookie('cookie_accepted')) return;
    var temp = document.createElement('div');
    temp.innerHTML = COOKIE_HTML;
    document.body.appendChild(temp.firstElementChild);
  }

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  window.acceptCookies = function() {
    document.cookie = 'cookie_accepted=1; path=/; max-age=' + (60*60*24*365);
    var el = document.getElementById('cookie-consent');
    if (el) el.classList.add('hidden');
  };

  document.addEventListener('DOMContentLoaded', function() {
    injectFooter();
    injectCookieConsent();
  });
})();
