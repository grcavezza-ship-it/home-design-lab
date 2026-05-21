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

    async loadData() {
        const [projects, properties, articles] = await Promise.all([
            this.fetchJson('/api/progetti'),
            this.fetchJson('/api/immobili'),
            this.fetchJson('/api/articoli')
        ]);

        this.progetti = Array.isArray(projects) ? projects : [];
        this.immobili = Array.isArray(properties) ? properties : [];
        this.articoli = Array.isArray(articles) ? articles : [];
    }

    async fetchJson(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                return [];
            }

            return await response.json();
        } catch (error) {
            console.error(`Errore caricamento ${url}:`, error);
            return [];
        }
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('a[href]');
        navLinks.forEach((link) => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:')) {
                link.addEventListener('click', () => {
                    if (href.endsWith('.html')) {
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
            homeProjectSection.innerHTML = `
                <span class="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-white mb-6 inline-block">Lab Portfolio</span>
                <h3 class="text-4xl font-serif text-white italic mb-4">${featuredProject.title || featuredProject.titolo || ''}</h3>
                <p class="text-white/70 max-w-md mb-8 font-body">${featuredProject.description || featuredProject.descrizione || ''}</p>
                <a href="dettaglio-progetto.html?id=${featuredProject.id}" class="flex items-center gap-2 text-tertiary font-bold uppercase tracking-widest text-xs hover:text-white transition-colors">
                    Vedi Dettagli Progetto
                    <span class="material-symbols-outlined text-sm">arrow_forward</span>
                </a>
            `;
        }
    }

    renderPortfolioProjects() {
        const portfolioGrid = document.querySelector('[data-portfolio-grid]');
        if (!portfolioGrid) {
            return;
        }

        const projectsHTML = this.progetti.map((progetto) => {
            const imageSrc = progetto.cover_image || `https://via.placeholder.com/400x600/f0eded/186C32?text=${encodeURIComponent(progetto.title || progetto.titolo || 'Progetto')}`;
            const category = progetto.category || progetto.categoria || 'progetto';
            const title = progetto.title || progetto.titolo || '';

            return `
                <div class="md:col-span-3 lg:col-span-4 group relative aspect-[3/4] overflow-hidden rounded-xl bg-surface-container-highest transition-all duration-500" data-portfolio-category="${category}">
                    <img alt="${title}" class="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110" src="${imageSrc}"/>
                    <div class="absolute inset-0 bg-primary/90 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-8 text-on-primary">
                        <span class="font-label text-[10px] uppercase tracking-widest mb-2 font-bold">${category}</span>
                        <h3 class="font-headline text-2xl italic leading-none mb-2">${title}</h3>
                        <p class="text-xs font-body opacity-80 uppercase tracking-tighter">${this.formatDate(progetto.created_at || progetto.data)}</p>
                        <a href="dettaglio-progetto.html?id=${progetto.id}" class="absolute inset-0 z-10"></a>
                    </div>
                </div>
            `;
        }).join('');

        if (projectsHTML) {
            portfolioGrid.innerHTML = projectsHTML;
        }
    }

    renderCollectionProperties() {
        const collectionGrid = document.querySelector('[data-collection-grid]');
        if (!collectionGrid) {
            return;
        }

        const propertiesHTML = this.immobili.map((immobile) => {
            const imageSrc = immobile.cover_image || `https://via.placeholder.com/400x300/f0eded/186C32?text=${encodeURIComponent(immobile.title || immobile.titolo || 'Immobile')}`;
            const title = immobile.title || immobile.titolo || '';

            return `
                <div class="group relative overflow-hidden rounded-xl bg-surface-container-highest transition-all duration-500">
                    <div class="aspect-[4/3] overflow-hidden">
                        <img alt="${title}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src="${imageSrc}"/>
                    </div>
                    <div class="p-8">
                        <h3 class="font-headline text-2xl italic mb-4">${title}</h3>
                        <p class="text-on-surface-variant mb-6">${immobile.description || immobile.descrizione || ''}</p>
                        <div class="flex justify-between items-center mb-6">
                            <span class="text-2xl font-serif text-primary">EUR ${immobile.price || immobile.prezzo || ''}</span>
                            <span class="text-sm text-on-surface-variant">${immobile.surface || immobile.superficie || ''}m²</span>
                        </div>
                        <div class="flex gap-4 text-sm text-on-surface-variant">
                            <span>${immobile.rooms || immobile.camere || ''} camere</span>
                            <span>·</span>
                            <span>${immobile.location || immobile.localita || ''}</span>
                        </div>
                        <a href="dettaglio-immobile.html?id=${immobile.id}" class="mt-6 inline-flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs hover:text-secondary transition-colors">
                            Scopri di più
                            <span class="material-symbols-outlined text-sm">arrow_forward</span>
                        </a>
                    </div>
                </div>
            `;
        }).join('');

        if (propertiesHTML) {
            collectionGrid.innerHTML = propertiesHTML;
        }
    }

    renderJournalArticles() {
        const journalGrid = document.querySelector('[data-journal-grid]');
        if (!journalGrid) {
            return;
        }

        const articlesHTML = this.articoli.map((articolo) => `
            <article class="group bg-surface-container rounded-xl overflow-hidden transition-all duration-500 hover:shadow-xl">
                <div class="aspect-[16/10] bg-surface-container-highest"></div>
                <div class="p-8">
                    <div class="flex items-center gap-4 mb-4">
                        <span class="text-[10px] uppercase tracking-widest font-bold text-primary">${articolo.category || articolo.categoria || 'journal'}</span>
                        <span class="text-sm text-on-surface-variant">${this.formatDate(articolo.created_at || articolo.data)}</span>
                    </div>
                    <h3 class="font-headline text-2xl italic mb-4 group-hover:text-primary transition-colors">${articolo.title || articolo.titolo || ''}</h3>
                    <p class="text-on-surface-variant mb-6">${articolo.description || articolo.descrizione || ''}</p>
                    <div class="flex items-center justify-between">
                        <span class="text-sm text-on-surface-variant">${articolo.author || articolo.autore || 'Home Design Lab'}</span>
                        <a href="#" class="inline-flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs hover:text-secondary transition-colors">
                            Leggi tutto
                            <span class="material-symbols-outlined text-sm">arrow_forward</span>
                        </a>
                    </div>
                </div>
            </article>
        `).join('');

        if (articlesHTML) {
            journalGrid.innerHTML = articlesHTML;
        }
    }

    renderProjectDetails() {
        if (!window.location.pathname.includes('dettaglio-progetto.html')) {
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const projectId = parseInt(urlParams.get('id'), 10);
        if (!projectId) {
            return;
        }

        const progetto = this.progetti.find((item) => Number(item.id) === projectId);
        if (progetto) {
            this.populateProjectDetails(progetto);
        }
    }

    renderPropertyDetails() {
        if (!window.location.pathname.includes('dettaglio-immobile.html')) {
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const propertyId = parseInt(urlParams.get('id'), 10);
        if (!propertyId) {
            return;
        }

        const immobile = this.immobili.find((item) => Number(item.id) === propertyId);
        if (immobile) {
            this.populatePropertyDetails(immobile);
        }
    }

    populateProjectDetails(progetto) {
        const titleElement = document.querySelector('[data-project-title]');
        const descriptionElement = document.querySelector('[data-project-description]');
        const detailsElement = document.querySelector('[data-project-details]');

        if (titleElement) {
            titleElement.textContent = progetto.title || progetto.titolo || '';
        }

        if (descriptionElement) {
            descriptionElement.textContent = progetto.description || progetto.descrizione || '';
        }

        if (detailsElement) {
            detailsElement.innerHTML = `
                <div class="grid grid-cols-2 gap-6">
                    <div>
                        <span class="text-sm text-on-surface-variant">Superficie</span>
                        <p class="text-xl font-serif text-primary">${progetto.surface || progetto.superficie || '-'}</p>
                    </div>
                    <div>
                        <span class="text-sm text-on-surface-variant">Località</span>
                        <p class="text-xl font-serif text-primary">${progetto.location || progetto.localita || '-'}</p>
                    </div>
                    <div>
                        <span class="text-sm text-on-surface-variant">Durata</span>
                        <p class="text-xl font-serif text-primary">${progetto.duration || progetto.durata || '-'}</p>
                    </div>
                    <div>
                        <span class="text-sm text-on-surface-variant">Budget</span>
                        <p class="text-xl font-serif text-primary">EUR ${progetto.budget || '-'}</p>
                    </div>
                </div>
            `;
        }
    }

    populatePropertyDetails(immobile) {
        const titleElement = document.querySelector('[data-property-title]');
        const descriptionElement = document.querySelector('[data-property-description]');
        const priceElement = document.querySelector('[data-property-price]');

        if (titleElement) {
            titleElement.textContent = immobile.title || immobile.titolo || '';
        }

        if (descriptionElement) {
            descriptionElement.textContent = immobile.description || immobile.descrizione || '';
        }

        if (priceElement) {
            priceElement.textContent = `EUR ${immobile.price || immobile.prezzo || ''}`;
        }
    }

    setupEventListeners() {
        const filterButtons = document.querySelectorAll('[data-portfolio-filter]');
        filterButtons.forEach((button) => {
            button.addEventListener('click', (event) => {
                const filter = event.target.getAttribute('data-portfolio-filter');
                this.filterPortfolio(filter);
            });
        });

        this.setupScrollAnimations();
    }

    filterPortfolio(category) {
        const projects = document.querySelectorAll('[data-portfolio-category]');
        projects.forEach((project) => {
            if (category === 'all' || project.getAttribute('data-portfolio-category') === category) {
                project.style.display = 'block';
            } else {
                project.style.display = 'none';
            }
        });

        const filterButtons = document.querySelectorAll('[data-portfolio-filter]');
        filterButtons.forEach((button) => {
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
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);

        document.querySelectorAll('[data-animate]').forEach((element) => {
            observer.observe(element);
        });
    }

    formatDate(dateString) {
        if (!dateString) {
            return '';
        }

        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('it-IT', options);
    }

    getProgetti() {
        return this.progetti;
    }

    getProgettoById(id) {
        return this.progetti.find((item) => Number(item.id) === parseInt(id, 10));
    }

    getImmobili() {
        return this.immobili;
    }

    getImmobileById(id) {
        return this.immobili.find((item) => Number(item.id) === parseInt(id, 10));
    }

    getArticoli() {
        return this.articoli;
    }

    getArticoloById(id) {
        return this.articoli.find((item) => Number(item.id) === parseInt(id, 10));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.homeDesignLab = new HomeDesignLab();
});

window.HomeDesignLab = HomeDesignLab;