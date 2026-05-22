/**
 * Cantieri Admin - Gestione Cantieri
 * Home Design Lab
 */
class CantieriAdmin {
    constructor() {
        this.currentUser = null;
        this.cantieri = [];
        this.currentCantiere = null;
        this.operatori = [];
        this.googleDrive = null;
    }

    async init() {
        await this.loadCurrentUser();
        await this.loadCantieri();
        this.renderDashboard();
        this.setupEventListeners();
    }

    async loadCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = 'templates/login.html';
            return;
        }
        this.currentUser = user;
        // Update user name if element exists
        const userNameEl = document.getElementById('user-name');
        if (userNameEl) userNameEl.textContent = user.email;
    }

    async loadCantieri() {
        try {
            console.log('Caricamento cantieri...');
            // Query semplice per test
            const { data, error } = await supabase
                .from('cantieri')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Errore query:', error);
                throw error;
            }
            
            console.log('Cantieri trovati:', data?.length || 0);
            this.cantieri = data || [];
        } catch (error) {
            console.error('Errore caricamento cantieri:', error);
            // Mostra messaggio nell'UI
            const container = document.getElementById('cantieri-list');
            if (container) {
                container.innerHTML = `
                    <div class="p-6 bg-red-50 border border-red-200 rounded-lg">
                        <h3 class="text-red-800 font-semibold">Errore di caricamento</h3>
                        <p class="text-red-600">${error.message || 'Errore sconosciuto'}</p>
                        <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                            Ricarica
                        </button>
                    </div>
                `;
            }
        }
    }

    renderDashboard() {
        console.log('Rendering dashboard...');
        const grid = document.getElementById('cantieri-grid');
        if (!grid) {
            console.error('ERRORE: Elemento #cantieri-grid non trovato!');
            return;
        }
        console.log('Cantieri caricati:', this.cantieri.length);
        
        // Aggiorna stats
        const stats = this.calculateStats();
        const totalEl = document.getElementById('stat-total');
        const attiviEl = document.getElementById('stat-attivi');
        const completatiEl = document.getElementById('stat-completati');
        const tasksEl = document.getElementById('stat-tasks');
        
        if (totalEl) totalEl.textContent = stats.total;
        if (attiviEl) attiviEl.textContent = stats.attivi;
        if (completatiEl) completatiEl.textContent = stats.completati;
        if (tasksEl) tasksEl.textContent = stats.tasksTotali;
        
        // Render solo la griglia dei cantieri
        grid.innerHTML = this.cantieri.length === 0 
            ? `
                <div class="text-center py-12 text-outline col-span-full">
                    <span class="material-symbols-outlined text-4xl mb-2">construction</span>
                    <p>Nessun cantiere trovato.</p>
                    <button onclick="cantieriAdmin.showCreateModal()" 
                            class="mt-4 bg-primary text-on-primary px-4 py-2 rounded-lg hover:bg-primary/90">
                        + Crea il tuo primo cantiere
                    </button>
                </div>
            `
            : this.cantieri.map(cantiere => this.renderCantiereCard(cantiere)).join('');
    }

    calculateStats() {
        return {
            total: this.cantieri.length,
            attivi: this.cantieri.filter(c => c.stato === 'attivo').length,
            completati: this.cantieri.filter(c => c.stato === 'completato').length,
            tasksTotali: this.cantieri.reduce((sum, c) => sum + (c.cantiere_tasks?.[0]?.count || 0), 0)
        };
    }

    renderCantiereCard(cantiere) {
        const operatoreNames = cantiere.cantieri_assegnazioni?.map(a => a.operatori_profiles?.nome).filter(Boolean).join(', ') || 'Nessuno';
        const tasksCount = cantiere.cantiere_tasks?.[0]?.count || 0;
        
        return `
            <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                 onclick="cantieriAdmin.openCantiereDetail('${cantiere.id}')">
                <div class="flex justify-between items-start mb-4">
                    <h3 class="font-semibold text-lg">${cantiere.nome_progetto}</h3>
                    <span class="px-2 py-1 text-xs rounded-full ${this.getStatoClass(cantiere.stato)}">
                        ${cantiere.stato}
                    </span>
                </div>
                <p class="text-gray-600 text-sm mb-2">${cantiere.indirizzo || 'Nessun indirizzo'}</p>
                <div class="text-sm text-gray-500 mb-4">
                    <div>Operatori: ${operatoreNames}</div>
                    <div>Tasks: ${tasksCount}</div>
                </div>
                ${cantiere.drive_folder_id ? `
                    <div class="text-xs text-blue-600">
                        📁 Google Drive collegato
                    </div>
                ` : ''}
            </div>
        `;
    }

    getStatoClass(stato) {
        const classes = {
            'attivo': 'bg-green-100 text-green-800',
            'completato': 'bg-blue-100 text-blue-800',
            'sospeso': 'bg-yellow-100 text-yellow-800'
        };
        return classes[stato] || 'bg-gray-100 text-gray-800';
    }

    showCreateModal() {
        document.getElementById('cantiere-modal').classList.remove('hidden');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    }

    async createCantiere(formData) {
        try {
            const { data, error } = await supabase
                .from('cantieri')
                .insert([{
                    nome_progetto: formData.nome,
                    indirizzo: formData.indirizzo,
                    drive_folder_id: formData.drive_folder_id,
                    riferimenti: formData.riferimenti,
                    creato_da: this.currentUser.id
                }])
                .select()
                .single();

            if (error) throw error;
            
            await this.loadCantieri();
            this.renderDashboard();
            document.getElementById('cantiere-modal').classList.add('hidden');
            alert('Cantiere creato con successo!');
        } catch (error) {
            console.error('Errore creazione cantiere:', error);
            alert('Errore nella creazione del cantiere');
        }
    }

    async openCantiereDetail(cantiereId) {
        this.currentCantiere = this.cantieri.find(c => c.id === cantiereId);
        if (!this.currentCantiere) return;
        
        await this.loadTasks(cantiereId);
        this.renderDetailModal();
    }

    async loadTasks(cantiereId) {
        try {
            const { data, error } = await supabase
                .from('cantiere_tasks')
                .select(`
                    *,
                    operatori_profiles:assegnato_a(nome)
                `)
                .eq('cantiere_id', cantiereId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            this.currentCantiere.tasks = data || [];
        } catch (error) {
            console.error('Errore caricamento tasks:', error);
        }
    }

    renderDetailModal() {
        const modal = document.getElementById('cantiere-detail-modal');
        const c = this.currentCantiere;
        
        modal.innerHTML = `
            <div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
                    <div class="flex justify-between items-start mb-6">
                        <h2 class="text-2xl font-bold">${c.nome_progetto}</h2>
                        <button onclick="document.getElementById('cantiere-detail-modal').classList.add('hidden')" 
                                class="text-gray-500 hover:text-gray-700">✕</button>
                    </div>
                    
                    <div class="grid md:grid-cols-2 gap-6">
                        <div>
                            <h3 class="font-semibold mb-2">Informazioni</h3>
                            <p class="text-sm text-gray-600">${c.indirizzo || 'Nessun indirizzo'}</p>
                            <p class="text-sm text-gray-600 mt-2">${c.riferimenti || ''}</p>
                        </div>
                        
                        <div>
                            <h3 class="font-semibold mb-2">Tasks (${c.tasks?.length || 0})</h3>
                            ${this.renderTasksList(c.tasks)}
                        </div>
                    </div>
                    
                    ${c.drive_folder_id ? `
                        <div class="mt-6">
                            <h3 class="font-semibold mb-2">Documenti Google Drive</h3>
                            <div id="drive-files" class="border rounded-lg p-4">
                                Caricamento documenti...
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        modal.classList.remove('hidden');
        
        if (c.drive_folder_id) {
            this.loadDriveFiles(c.drive_folder_id);
        }
    }

    renderTasksList(tasks) {
        if (!tasks || tasks.length === 0) {
            return '<p class="text-gray-500 text-sm">Nessun task</p>';
        }
        
        return `
            <div class="space-y-2">
                ${tasks.map(task => `
                    <div class="flex items-center gap-2 p-2 bg-gray-50 rounded ${task.completato ? 'opacity-50' : ''}">
                        <input type="checkbox" ${task.completato ? 'checked' : ''} 
                               onchange="cantieriAdmin.toggleTask('${task.id}')">
                        <span class="text-sm ${task.completato ? 'line-through' : ''}">${task.descrizione}</span>
                        ${task.operatori_profiles?.nome ? `
                            <span class="text-xs text-gray-500">(${task.operatori_profiles.nome})</span>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    async toggleTask(taskId) {
        try {
            const task = this.currentCantiere.tasks.find(t => t.id === taskId);
            const { error } = await supabase
                .from('cantiere_tasks')
                .update({ completato: !task.completato })
                .eq('id', taskId);

            if (error) throw error;
            
            task.completato = !task.completato;
            this.renderDetailModal();
        } catch (error) {
            console.error('Errore aggiornamento task:', error);
            alert('Errore nell\'aggiornamento del task');
        }
    }

    async loadDriveFiles(folderId) {
        // Implementazione base - può essere estesa con Google Drive API
        const container = document.getElementById('drive-files');
        container.innerHTML = `
            <div class="text-sm text-blue-600">
                <a href="https://drive.google.com/drive/folders/${folderId}" target="_blank" class="hover:underline">
                    📁 Apri cartella Google Drive
                </a>
            </div>
        `;
    }

    setupEventListeners() {
        // Setup eventuali listener aggiuntivi
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.getElementById('detail-modal')?.classList.add('hidden');
                document.getElementById('create-modal')?.classList.add('hidden');
            }
        });
    }
}

// Inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    try {
        let cantieriAdmin = new CantieriAdmin();
        cantieriAdmin.init();
    } catch (error) {
        console.error('Errore inizializzazione:', error);
        document.getElementById('cantieri-grid').innerHTML = `
            <div class="col-span-full p-6 bg-red-50 border border-red-200 rounded-lg">
                <h3 class="text-red-800 font-semibold mb-2">Errore di caricamento</h3>
                <p class="text-red-600">${error.message}</p>
                <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                    Ricarica Pagina
                </button>
            </div>
        `;
    }
});
