// Home Design Lab - Dynamic Site Engine
// Sistema per rendere dinamico il sito statico con JavaScript

class HomeDesignLab {
    constructor() {
        this.baseURL = window.location.origin;
        this.progetti = [];
        this.immobili = [];
        this.articoli = [];
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupNavigation();
        this.renderDynamicContent();
        this.setupEventListeners();
    }

    // Carica i dati statici (in attesa di backend vero)
    async loadData() {
        // Dati di esempio - in futuro verranno caricati da API
        this.progetti = [
            {
                id: 1,
                titolo: "Attico Prisma",
                descrizione: "Progetto di ristrutturazione completa di un attico con vista panoramica. Design moderno con materiali sostenibili e massima illuminazione naturale.",
                categoria: "residenziale",
                immagini: ["attico1.jpg", "attico2.jpg"],
                data: "2024-01-15",
                dettagli: {
                    superficie: "180mq",
                    localita: "Milano",
                    durata: "6 mesi",
                    budget: "150.000"
                }
            },
            {
                id: 2,
                titolo: "Villa Orizzonte",
                descrizione: "Nuova costruzione villa moderna con giardino paesaggistico. Architettura integrata con il paesaggio circostante.",
                categoria: "residenziale",
                immagini: ["villa1.jpg", "villa2.jpg"],
                data: "2024-02-20",
                dettagli: {
                    superficie: "320mq",
                    localita: "Como",
                    durata: "12 mesi",
                    budget: "450.000"
                }
            },
            {
                id: 3,
                titolo: "Milan Design Hub",
                descrizione: "Spazio commerciale polifunzionale nel cuore di Milano. Design innovativo per workspace creativi.",
                categoria: "commerciale",
                immagini: ["hub1.jpg", "hub2.jpg"],
                data: "2024-03-10",
                dettagli: {
                    superficie: "450mq",
                    localita: "Milano",
                    durata: "8 mesi",
                    budget: "280.000"
                }
            }
        ];

        this.immobili = [
            {
                id: 1,
                titolo: "Villa Orizzonte",
                descrizione: "Esclusiva villa moderna con piscina infinity e giardino paesaggistico. Vista panoramica sulla collina.",
                prezzo: "850.000",
                localita: "Como",
                superficie: "320",
                camere: 4,
                immagini: ["villa1.jpg", "villa2.jpg"],
                caratteristiche: ["Piscina", "Giardino", "Vista panoramica", "Riscaldamento a pavimento"]
            }
        ];

        this.articoli = [
            {
                id: 1,
                titolo: "Tendenze architettura 2024",
                descrizione: "Le nuove tendenze nel design architettonico per il nuovo anno",
                contenuto: "L'architettura del 2024 si evolve verso soluzioni sempre più sostenibili e integrate con la natura...",
                data: "2024-03-10",
                categoria: "design",
                autore: "Design Lab Team"
            },
            {
                id: 2,
                titolo: "Materiali ecosostenibili",
                descrizione: "Guida ai materiali innovativi per l'edilizia sostenibile",
                contenuto: "La scelta dei materiali è fondamentale per la realizzazione di edifici sostenibili...",
                data: "2024-03-05",
                categoria: "sostenibilità",
                autore: "Engineering Team"
            }
        ];
    }

    setupNavigation() {
        // Setup navigazione dinamica
        const navLinks = document.querySelectorAll('a[href]');
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:')) {
                link.addEventListener('click', (e) => {
                    if (href.endsWith('.html')) {
                        // Per ora manteniamo i link HTML statici
                        return;
                    }
                });
            }
        });
    }

    renderDynamicContent() {
        this.renderHomePageProjects();
        this.renderPortfolioProjects();
        this.renderCollectionProperties();
        this.renderJournalArticles();
        this.renderProjectDetails();
        this.renderPropertyDetails();
    }

    renderHomePageProjects() {
        const homeProjectSection = document.querySelector('[data-home-projects]');
        if (homeProjectSection && this.progetti.length > 0) {
            const featuredProject = this.progetti[0];
            const projectHTML = `
                <span class="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-white mb-6 inline-block">Lab Portfolio</span>
                <h3 class="text-4xl font-serif text-white italic mb-4">${featuredProject.titolo}</h3>
                <p class="text-white/70 max-w-md mb-8 font-body">${featuredProject.descrizione}</p>
                <a href="dettaglio-progetto.html?id=${featuredProject.id}" class="flex items-center gap-2 text-tertiary font-bold uppercase tracking-widest text-xs hover:text-white transition-colors">
                    Vedi Dettagli Progetto
                    <span class="material-symbols-outlined text-sm">arrow_forward</span>
                </a>
            `;
            homeProjectSection.innerHTML = projectHTML;
        }
    }

    renderPortfolioProjects() {
        const portfolioGrid = document.querySelector('[data-portfolio-grid]');
        if (portfolioGrid) {
            let projectsHTML = '';
            this.progetti.forEach(progetto => {
                const imageSrc = progetto.immagini && progetto.immagini.length > 0 
                    ? `../assets/${progetto.immagini[0]}` 
                    : `https://via.placeholder.com/400x600/f0eded/186C32?text=${encodeURIComponent(progetto.titolo)}`;
                
                projectsHTML += `
                    <div class="md:col-span-3 lg:col-span-4 group relative aspect-[3/4] overflow-hidden rounded-xl bg-surface-container-highest transition-all duration-500" data-portfolio-category="${progetto.categoria}">
                        <img alt="${progetto.titolo}" class="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110" src="${imageSrc}"/>
                        <div class="absolute inset-0 bg-primary/90 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-8 text-on-primary">
                            <span class="font-label text-[10px] uppercase tracking-widest mb-2 font-bold">${progetto.categoria.charAt(0).toUpperCase() + progetto.categoria.slice(1)}</span>
                            <h3 class="font-headline text-2xl italic leading-none mb-2">${progetto.titolo}</h3>
                            <p class="text-xs font-body opacity-80 uppercase tracking-tighter">${this.formatDate(progetto.data)}</p>
                            <a href="dettaglio-progetto.html?id=${progetto.id}" class="absolute inset-0 z-10"></a>
                        </div>
                    </div>
                `;
            });
            
            if (projectsHTML) {
                portfolioGrid.innerHTML = projectsHTML;
            }
        }
    }

    renderCollectionProperties() {
        const collectionGrid = document.querySelector('[data-collection-grid]');
        if (collectionGrid) {
            let propertiesHTML = '';
            this.immobili.forEach(immobile => {
                const imageSrc = immobile.immagini && immobile.immagini.length > 0 
                    ? `../assets/${immobile.immagini[0]}` 
                    : `https://via.placeholder.com/400x300/f0eded/186C32?text=${encodeURIComponent(immobile.titolo)}`;
                
                propertiesHTML += `
                    <div class="group relative overflow-hidden rounded-xl bg-surface-container-highest transition-all duration-500">
                        <div class="aspect-[4/3] overflow-hidden">
                            <img alt="${immobile.titolo}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src="${imageSrc}"/>
                        </div>
                        <div class="p-8">
                            <h3 class="font-headline text-2xl italic mb-4">${immobile.titolo}</h3>
                            <p class="text-on-surface-variant mb-6">${immobile.descrizione}</p>
                            <div class="flex justify-between items-center mb-6">
                                <span class="text-2xl font-serif text-primary">EUR ${immobile.prezzo}</span>
                                <span class="text-sm text-on-surface-variant">${immobile.superficie}m²</span>
                            </div>
                            <div class="flex gap-4 text-sm text-on-surface-variant">
                                <span>${immobile.camere} camere</span>
                                <span>·</span>
                                <span>${immobile.localita}</span>
                            </div>
                            <a href="dettaglio-immobile.html?id=${immobile.id}" class="mt-6 inline-flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs hover:text-secondary transition-colors">
                                Scopri di più
                                <span class="material-symbols-outlined text-sm">arrow_forward</span>
                            </a>
                        </div>
                    </div>
                `;
            });
            
            if (propertiesHTML) {
                collectionGrid.innerHTML = propertiesHTML;
            }
        }
    }

    renderJournalArticles() {
        const journalGrid = document.querySelector('[data-journal-grid]');
        if (journalGrid) {
            let articlesHTML = '';
            this.articoli.forEach(articolo => {
                articlesHTML += `
                    <article class="group bg-surface-container rounded-xl overflow-hidden transition-all duration-500 hover:shadow-xl">
                        <div class="aspect-[16/10] bg-surface-container-highest"></div>
                        <div class="p-8">
                            <div class="flex items-center gap-4 mb-4">
                                <span class="text-[10px] uppercase tracking-widest font-bold text-primary">${articolo.categoria}</span>
                                <span class="text-sm text-on-surface-variant">${this.formatDate(articolo.data)}</span>
                            </div>
                            <h3 class="font-headline text-2xl italic mb-4 group-hover:text-primary transition-colors">${articolo.titolo}</h3>
                            <p class="text-on-surface-variant mb-6">${articolo.descrizione}</p>
                            <div class="flex items-center justify-between">
                                <span class="text-sm text-on-surface-variant">${articolo.autore}</span>
                                <a href="#" class="inline-flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs hover:text-secondary transition-colors">
                                    Leggi tutto
                                    <span class="material-symbols-outlined text-sm">arrow_forward</span>
                                </a>
                            </div>
                        </div>
                    </article>
                `;
            });
            
            if (articlesHTML) {
                journalGrid.innerHTML = articlesHTML;
            }
        }
    }

    renderProjectDetails() {
        if (window.location.pathname.includes('dettaglio-progetto.html')) {
            const urlParams = new URLSearchParams(window.location.search);
            const projectId = parseInt(urlParams.get('id'));
            
            if (projectId) {
                const progetto = this.progetti.find(p => p.id === projectId);
                if (progetto) {
                    this.populateProjectDetails(progetto);
                }
            }
        }
    }

    renderPropertyDetails() {
        if (window.location.pathname.includes('dettaglio-immobile.html')) {
            const urlParams = new URLSearchParams(window.location.search);
            const propertyId = parseInt(urlParams.get('id'));
            
            if (propertyId) {
                const immobile = this.immobili.find(i => i.id === propertyId);
                if (immobile) {
                    this.populatePropertyDetails(immobile);
                }
            }
        }
    }

    populateProjectDetails(progetto) {
        const titleElement = document.querySelector('[data-project-title]');
        const descriptionElement = document.querySelector('[data-project-description]');
        const detailsElement = document.querySelector('[data-project-details]');
        
        if (titleElement) titleElement.textContent = progetto.titolo;
        if (descriptionElement) descriptionElement.textContent = progetto.descrizione;
        
        if (detailsElement) {
            const detailsHTML = `
                <div class="grid grid-cols-2 gap-6">
                    <div>
                        <span class="text-sm text-on-surface-variant">Superficie</span>
                        <p class="text-xl font-serif text-primary">${progetto.dettagli.superficie}</p>
                    </div>
                    <div>
                        <span class="text-sm text-on-surface-variant">Località</span>
                        <p class="text-xl font-serif text-primary">${progetto.dettagli.localita}</p>
                    </div>
                    <div>
                        <span class="text-sm text-on-surface-variant">Durata</span>
                        <p class="text-xl font-serif text-primary">${progetto.dettagli.durata}</p>
                    </div>
                    <div>
                        <span class="text-sm text-on-surface-variant">Budget</span>
                        <p class="text-xl font-serif text-primary">EUR ${progetto.dettagli.budget}</p>
                    </div>
                </div>
            `;
            detailsElement.innerHTML = detailsHTML;
        }
    }

    populatePropertyDetails(immobile) {
        const titleElement = document.querySelector('[data-property-title]');
        const descriptionElement = document.querySelector('[data-property-description]');
        const priceElement = document.querySelector('[data-property-price]');
        
        if (titleElement) titleElement.textContent = immobile.titolo;
        if (descriptionElement) descriptionElement.textContent = immobile.descrizione;
        if (priceElement) priceElement.textContent = `EUR ${immobile.prezzo}`;
    }

    setupEventListeners() {
        // Filtri portfolio
        const filterButtons = document.querySelectorAll('[data-portfolio-filter]');
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const filter = e.target.getAttribute('data-portfolio-filter');
                this.filterPortfolio(filter);
            });
        });

        // Animazioni scroll
        this.setupScrollAnimations();
    }

    filterPortfolio(category) {
        const projects = document.querySelectorAll('[data-portfolio-category]');
        projects.forEach(project => {
            if (category === 'all' || project.getAttribute('data-portfolio-category') === category) {
                project.style.display = 'block';
            } else {
                project.style.display = 'none';
            }
        });

        // Aggiorna stato bottoni
        const filterButtons = document.querySelectorAll('[data-portfolio-filter]');
        filterButtons.forEach(button => {
            if (button.getAttribute('data-portfolio-filter') === category) {
                button.classList.add('bg-primary', 'text-on-primary');
                button.classList.remove('bg-surface-container-low', 'text-on-surface-variant');
            } else {
                button.classList.remove('bg-primary', 'text-on-primary');
                button.classList.add('bg-surface-container-low', 'text-on-surface-variant');
            }
        });
    }

    setupScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);

        // Osserva elementi con data-animate
        document.querySelectorAll('[data-animate]').forEach(el => {
            observer.observe(el);
        });
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('it-IT', options);
    }

    // Metodi pubblici
    getProgetti() {
        return this.progetti;
    }

    getProgettoById(id) {
        return this.progetti.find(p => p.id === parseInt(id));
    }

    getImmobili() {
        return this.immobili;
    }

    getImmobileById(id) {
        return this.immobili.find(i => i.id === parseInt(id));
    }

    getArticoli() {
        return this.articoli;
    }

    getArticoloById(id) {
        return this.articoli.find(a => a.id === parseInt(id));
    }
}

// Inizializzazione quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.homeDesignLab = new HomeDesignLab();
});

// Esporta per uso globale
window.HomeDesignLab = HomeDesignLab;
