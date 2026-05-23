(function() {
  'use strict';

  function init() {
    var searchInput = document.querySelector('input[placeholder*="Search" i], input[placeholder*="Cerca" i]');
    if (!searchInput || searchInput.dataset.hdlSearchInit) return;
    searchInput.dataset.hdlSearchInit = '1';

    var searchContainer = searchInput.closest('.relative');
    if (!searchContainer) return;

    var resultsEl = document.createElement('div');
    resultsEl.id = 'hdl-search-results';
    resultsEl.className = 'hidden absolute top-full left-0 right-0 mt-2 bg-white dark:bg-stone-900 rounded-lg shadow-lg border border-stone-200 dark:border-stone-700 z-50 max-h-96 overflow-y-auto';
    searchContainer.style.position = 'relative';
    searchContainer.appendChild(resultsEl);

    var currentTerm = '';
    var debounceTimer = null;

    searchInput.addEventListener('input', function() {
      var term = this.value.trim().toLowerCase();
      if (term === currentTerm) return;
      currentTerm = term;

      clearTimeout(debounceTimer);
      if (term.length < 2) {
        resultsEl.classList.add('hidden');
        resultsEl.innerHTML = '';
        return;
      }

      debounceTimer = setTimeout(function() {
        performSearch(term, resultsEl);
      }, 300);
    });

    document.addEventListener('click', function(e) {
      if (!searchContainer.contains(e.target)) {
        resultsEl.classList.add('hidden');
      }
    });

    searchInput.addEventListener('focus', function() {
      if (resultsEl.children.length > 0) {
        resultsEl.classList.remove('hidden');
      }
    });
  }

  async function performSearch(term, resultsEl) {
    resultsEl.innerHTML = '<div class="p-4 text-center text-sm text-on-surface-variant"><div class="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>Ricerca in corso...</div>';
    resultsEl.classList.remove('hidden');

    var results = [];

    try {
      if (window.supabase) {
        var promises = [];

        if (window.supabase.from) {
          promises.push(
            window.supabase.from('projects')
              .select('id, titolo, status')
              .or('titolo.ilike.%' + term + '%,descrizione.ilike.%' + term + '%')
              .limit(5)
              .then(function(r) {
                return (r.data || []).map(function(p) {
                  return { id: p.id, title: p.titolo, type: 'Progetto', url: 'dettaglio-progetto.html?id=' + p.id, status: p.status };
                });
              }).catch(function() { return []; })
          );

          promises.push(
            window.supabase.from('properties')
              .select('id, titolo, citta')
              .or('titolo.ilike.%' + term + '%,citta.ilike.%' + term + '%,descrizione.ilike.%' + term + '%')
              .limit(5)
              .then(function(r) {
                return (r.data || []).map(function(p) {
                  return { id: p.id, title: p.titolo, type: 'Immobile', url: 'dettaglio-immobile.html?id=' + p.id, sub: p.citta };
                });
              }).catch(function() { return []; })
          );

          promises.push(
            window.supabase.from('clienti_profiles')
              .select('id, nome, email')
              .or('nome.ilike.%' + term + '%,email.ilike.%' + term + '%')
              .limit(5)
              .then(function(r) {
                return (r.data || []).map(function(c) {
                  return { id: c.id, title: c.nome, type: 'Cliente', url: 'dettaglio-cliente.html?id=' + c.id, sub: c.email };
                });
              }).catch(function() { return []; })
          );

          var role = window.currentUserRole;
          if (role === 'senior' || role === 'admin') {
            promises.push(
              window.supabase.from('operatori_profiles')
                .select('id, nome, cognome, ruolo')
                .or('nome.ilike.%' + term + '%,cognome.ilike.%' + term + '%,email.ilike.%' + term + '%')
                .limit(5)
                .then(function(r) {
                  return (r.data || []).map(function(o) {
                    return { id: o.id, title: (o.nome || '') + ' ' + (o.cognome || ''), type: 'Collaboratore', url: 'gestione-team.html', sub: o.ruolo };
                  });
                }).catch(function() { return []; })
            );
          }
        }

        var resultsArrays = await Promise.all(promises);
        for (var i = 0; i < resultsArrays.length; i++) {
          results = results.concat(resultsArrays[i]);
        }
      }
    } catch (e) {
      console.warn('[Search] Errore:', e.message);
    }

    if (results.length === 0) {
      resultsEl.innerHTML = '<div class="p-6 text-center text-sm text-on-surface-variant"><span class="material-symbols-outlined text-2xl mb-1 block">search_off</span>Nessun risultato per "' + term + '"</div>';
      return;
    }

    var iconMap = { 'Progetto': 'folder', 'Immobile': 'real_estate_agent', 'Cliente': 'person', 'Collaboratore': 'groups' };
    var html = '<div class="p-2">';
    for (var j = 0; j < results.length; j++) {
      var r = results[j];
      html += '<a href="' + r.url + '" class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">' +
        '<span class="material-symbols-outlined text-primary text-lg">' + (iconMap[r.type] || 'search') + '</span>' +
        '<div class="min-w-0 flex-1">' +
          '<p class="text-sm font-medium text-on-surface truncate">' + r.title + '</p>' +
          '<p class="text-xs text-on-surface-variant">' + r.type + (r.sub ? ' · ' + r.sub : '') + '</p>' +
        '</div>' +
      '</a>';
    }
    html += '</div>';
    resultsEl.innerHTML = html;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
