// Home Design Lab - Search System
// Sistema di ricerca per progetti, immobili e articoli

class SearchSystem {
    constructor() {
        this.searchIndex = [];
        this.isSearchOpen = false;
        this.init();
    }

    init() {
        this.buildSearchIndex();
        this.setupSearchUI();
        this.setupEventListeners();
    }

    buildSearchIndex() {
        // Costruisci indice di ricerca dai dati dinamici
        if (window.homeDesignLab) {
            const progetti = window.homeDesignLab.getProgetti();
            const immobili = window.homeDesignLab.getImmobili();
            const articoli = window.homeDesignLab.getArticoli();

            // Indice progetti
            progetti.forEach(progetto => {
                this.searchIndex.push({
                    type: 'progetto',
                    id: progetto.id,
                    title: progetto.titolo,
                    description: progetto.descrizione,
                    category: progetto.categoria,
                    url: `dettaglio-progetto.html?id=${progetto.id}`,
                    keywords: this.extractKeywords(progetto.titolo + ' ' + progetto.descrizione)
                });
            });

            // Indice immobili
            immobili.forEach(immobile => {
                this.searchIndex.push({
                    type: 'immobile',
                    id: immobile.id,
                    title: immobile.titolo,
                    description: immobile.descrizione,
                    category: 'collection',
                    url: `dettaglio-immobile.html?id=${immobile.id}`,
                    keywords: this.extractKeywords(immobile.titolo + ' ' + immobile.descrizione + ' ' + immobile.localita)
                });
            });

            // Indice articoli
            articoli.forEach(articolo => {
                this.searchIndex.push({
                    type: 'articolo',
                    id: articolo.id,
                    title: articolo.titolo,
                    description: articolo.descrizione,
                    category: articolo.categoria,
                    url: `journal.html#${articolo.id}`,
                    keywords: this.extractKeywords(articolo.titolo + ' ' + articolo.descrizione + ' ' + articolo.contenuto)
                });
            });
        }
    }

    extractKeywords(text) {
        // Estrai parole chiave dal testo
        return text.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Rimuovi accenti
            .replace(/[^\w\s]/g, ' ') // Solo lettere e numeri
            .split(/\s+/)
            .filter(word => word.length > 2) // Ignora parole corte
            .filter((word, index, self) => self.indexOf(word) === index); // Rimuovi duplicati
    }

    setupSearchUI() {
        // Crea UI ricerca se non esiste
        if (!document.querySelector('[data-search-container]')) {
            const searchHTML = `
                <div class="search-overlay fixed inset-0 bg-black/50 z-50 hidden" data-search-overlay>
                    <div class="relative h-full flex items-start justify-center pt-20">
                        <div class="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden" data-search-container>
                            <div class="p-6 border-b border-outline-variant/20">
                                <div class="flex items-center gap-4">
                                    <div class="relative flex-1">
                                        <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                                            search
                                        </span>
                                        <input 
                                            type="text" 
                                            placeholder="Cerca progetti, immobili, articoli..."
                                            class="w-full bg-surface-container border border-outline-variant/30 rounded-lg pl-12 pr-4 py-3 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                            data-search-input
                                        >
                                    </div>
                                    <button class="p-2 hover:bg-surface-container rounded-lg transition-colors" data-search-close>
                                        <span class="material-symbols-outlined text-on-surface-variant">close</span>
                                    </button>
                                </div>
                            </div>
                            <div class="p-6 overflow-y-auto max-h-[60vh]" data-search-results>
                                <div class="text-center text-on-surface-variant py-12">
                                    <span class="material-symbols-outlined text-4xl mb-4">search</span>
                                    <p>Inizia a digitare per cercare...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', searchHTML);
        }
    }

    setupEventListeners() {
        // Pulsanti search nella navbar
        const searchButtons = document.querySelectorAll('.material-symbols-outlined[aria-label="search"], button:has(.material-symbols-outlined[text="search"])');
        searchButtons.forEach(button => {
            if (!button.hasAttribute('data-search-bound')) {
                button.addEventListener('click', () => this.openSearch());
                button.setAttribute('data-search-bound', 'true');
            }
        });

        // Input search
        const searchInput = document.querySelector('[data-search-input]');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') this.closeSearch();
            });
        }

        // Close search
        const closeBtn = document.querySelector('[data-search-close]');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeSearch());
        }

        // Overlay click
        const overlay = document.querySelector('[data-search-overlay]');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this.closeSearch();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.openSearch();
            }
            if (e.key === 'Escape' && this.isSearchOpen) {
                this.closeSearch();
            }
        });
    }

    openSearch() {
        const overlay = document.querySelector('[data-search-overlay]');
        const input = document.querySelector('[data-search-input]');
        
        if (overlay) {
            overlay.classList.remove('hidden');
            this.isSearchOpen = true;
            
            // Focus sull'input
            setTimeout(() => {
                if (input) {
                    input.focus();
                    input.value = '';
                    this.handleSearch('');
                }
            }, 100);
        }
    }

    closeSearch() {
        const overlay = document.querySelector('[data-search-overlay]');
        if (overlay) {
            overlay.classList.add('hidden');
            this.isSearchOpen = false;
        }
    }

    handleSearch(query) {
        const resultsContainer = document.querySelector('[data-search-results]');
        if (!resultsContainer) return;

        const normalizedQuery = query.toLowerCase().trim();
        
        if (!normalizedQuery) {
            resultsContainer.innerHTML = `
                <div class="text-center text-on-surface-variant py-12">
                    <span class="material-symbols-outlined text-4xl mb-4">search</span>
                    <p>Inizia a digitare per cercare...</p>
                </div>
            `;
            return;
        }

        // Esegui ricerca
        const results = this.search(normalizedQuery);
        
        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="text-center text-on-surface-variant py-12">
                    <span class="material-symbols-outlined text-4xl mb-4">search_off</span>
                    <p>Nessun risultato trovato per "${query}"</p>
                    <p class="text-sm mt-2">Prova con altri termini di ricerca</p>
                </div>
            `;
            return;
        }

        // Mostra risultati
        this.displayResults(results, query);
    }

    search(query) {
        const queryWords = query.split(/\s+/);
        
        return this.searchIndex.filter(item => {
            // Calcolo punteggio pertinenza
            let score = 0;
            
            // Title match (peso massimo)
            const titleWords = item.title.toLowerCase().split(/\s+/);
            queryWords.forEach(qWord => {
                if (titleWords.includes(qWord)) score += 10;
                if (item.title.toLowerCase().includes(query)) score += 20;
            });
            
            // Description match
            if (item.description.toLowerCase().includes(query)) score += 5;
            
            // Keywords match
            queryWords.forEach(qWord => {
                if (item.keywords.includes(qWord)) score += 3;
            });
            
            // Category match
            if (item.category && item.category.toLowerCase().includes(query)) score += 2;
            
            return score > 0;
        }).sort((a, b) => {
            // Ordina per pertinenza (implementare scoring)
            return 0;
        });
    }

    displayResults(results, query) {
        const resultsContainer = document.querySelector('[data-search-results]');
        
        let html = `
            <div class="mb-4">
                <p class="text-sm text-on-surface-variant">
                    ${results.length} risultati per "${query}"
                </p>
            </div>
            <div class="space-y-3">
        `;

        results.forEach(result => {
            const icon = this.getResultIcon(result.type);
            const category = this.getCategoryLabel(result.category);
            
            html += `
                <a href="${result.url}" class="block p-4 bg-surface-container rounded-lg border border-outline-variant/20 hover:border-primary/30 hover:bg-surface-container-high transition-all group">
                    <div class="flex items-start gap-4">
                        <div class="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span class="material-symbols-outlined text-primary">${icon}</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                                <h3 class="font-semibold text-on-surface group-hover:text-primary transition-colors">
                                    ${this.highlightMatch(result.title, query)}
                                </h3>
                                <span class="text-xs px-2 py-1 bg-surface-container rounded-full text-on-surface-variant">
                                    ${category}
                                </span>
                            </div>
                            <p class="text-sm text-on-surface-variant line-clamp-2">
                                ${this.highlightMatch(result.description, query)}
                            </p>
                        </div>
                    </div>
                </a>
            `;
        });

        html += '</div>';
        resultsContainer.innerHTML = html;
    }

    getResultIcon(type) {
        const icons = {
            progetto: 'architecture',
            immobile: 'home',
            articolo: 'article'
        };
        return icons[type] || 'description';
    }

    getCategoryLabel(category) {
        const labels = {
            residenziale: 'Residenziale',
            commerciale: 'Commerciale',
            collection: 'Collection',
            design: 'Design',
            sostenibilità: 'Sostenibilità',
            materiali: 'Materiali'
        };
        return labels[category] || category;
    }

    highlightMatch(text, query) {
        if (!query) return text;
        
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<mark class="bg-primary/20 text-primary px-1 rounded">$1</mark>');
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

// Inizializzazione quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    // Attendi che homeDesignLab sia caricato
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                window.searchSystem = new SearchSystem();
            }, 1000); // Attendi caricamento dati dinamici
        });
    } else {
        setTimeout(() => {
            window.searchSystem = new SearchSystem();
        }, 1000);
    }
});

// Esporta per uso globale
window.SearchSystem = SearchSystem;
