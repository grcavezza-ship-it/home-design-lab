// Construction Site Management System - Operator Panel
// React component for operators to manage their assigned construction sites

class OperatorPanel {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.assignedCantieri = [];
        this.currentCantiere = null;
        this.init();
    }

    async init() {
        // Initialize Supabase client
        this.supabase = window.supabase || supabase;
        
        // Get current user
        await this.getCurrentUser();
        
        // Load assigned cantieri
        await this.loadAssignedCantieri();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Render initial UI
        this.renderCantieriList();
    }

    async getCurrentUser() {
        try {
            const { data: { user }, error } = await this.supabase.auth.getUser();
            if (error) throw error;
            
            this.currentUser = user;
            
            // Get user profile
            const { data: profile } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('user_id', user.id)
                .single();
                
            this.userProfile = profile;
        } catch (error) {
            console.error('Error getting current user:', error);
            this.showError('Errore nel caricamento del profilo utente');
        }
    }

    async loadAssignedCantieri() {
        try {
            const { data, error } = await this.supabase
                .from('cantieri_assegnazioni')
                .select(`
                    cantiere_id,
                    ruolo,
                    cantieri (
                        id,
                        nome_progetto,
                        indirizzo,
                        data_inizio,
                        stato,
                        drive_folder_id,
                        riferimenti,
                        created_at,
                        cantiere_tasks (
                            id,
                            descrizione,
                            completato,
                            assegnato_a,
                            categoria,
                            priorita,
                            note,
                            created_at
                        )
                    )
                `)
                .eq('operatore_id', this.currentUser.id)
                .eq('cantieri.stato', 'attivo');

            if (error) throw error;

            this.assignedCantieri = data?.map(item => ({
                ...item.cantieri,
                ruolo_assegnato: item.ruolo,
                data_assegnazione: item.data_assegnazione
            })) || [];
        } catch (error) {
            console.error('Error loading assigned cantieri:', error);
            this.showError('Errore nel caricamento dei cantieri assegnati');
        }
    }

    setupEventListeners() {
        // Task completion toggle
        document.addEventListener('change', async (e) => {
            if (e.target.matches('.task-checkbox')) {
                const taskId = e.target.dataset.taskId;
                await this.toggleTaskCompletion(taskId);
            }
        });

        // Filter cantieri
        document.getElementById('filter-cantieri')?.addEventListener('change', (e) => {
            this.filterCantieri(e.target.value);
        });

        // Search cantieri
        document.getElementById('search-cantieri')?.addEventListener('input', (e) => {
            this.searchCantieri(e.target.value);
        });
    }

    renderCantieriList() {
        const container = document.getElementById('cantieri-container');
        if (!container) return;

        if (this.assignedCantieri.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <span class="material-symbols-outlined text-6xl text-gray-300 mb-4">business</span>
                    <h3 class="text-xl font-semibold text-gray-600 mb-2">Nessun cantiere assegnato</h3>
                    <p class="text-gray-500">Non hai ancora cantieri assegnati. Contatta l'amministratore per ricevere assegnazioni.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-primary mb-4">I Miei Cantieri</h2>
                
                <!-- Filters -->
                <div class="flex flex-col sm:flex-row gap-4 mb-6">
                    <div class="flex-1">
                        <input type="text" 
                               id="search-cantieri"
                               placeholder="Cerca cantiere..." 
                               class="w-full px-4 py-2 border border-outline/30 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                    </div>
                    <select id="filter-cantieri" 
                            class="px-4 py-2 border border-outline/30 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                        <option value="">Tutti i cantieri</option>
                        <option value="rilievo">Con tasks Rilievo</option>
                        <option value="impiantistica">Con tasks Impiantistica</option>
                        <option value="sicurezza">Con tasks Sicurezza</option>
                        <option value="completati">Tasks completati</option>
                        <option value="da-completare">Tasks da completare</option>
                    </select>
                </div>
            </div>

            <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                ${this.assignedCantieri.map(cantiere => this.renderCantiereCard(cantiere)).join('')}
            </div>
        `;
    }

    renderCantiereCard(cantiere) {
        const totalTasks = cantiere.cantiere_tasks?.length || 0;
        const completedTasks = cantiere.cantiere_tasks?.filter(t => t.completato).length || 0;
        const myTasks = cantiere.cantiere_tasks?.filter(t => t.assegnato_a === this.currentUser.id) || [];
        const myCompletedTasks = myTasks.filter(t => t.completato).length || 0;
        
        const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const myProgressPercentage = myTasks.length > 0 ? Math.round((myCompletedTasks / myTasks.length) * 100) : 0;

        return `
            <div class="bg-surface-container rounded-lg shadow-sm border border-outline/20 overflow-hidden hover:shadow-md transition-shadow">
                <div class="p-6">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="text-lg font-semibold text-primary mb-2">${cantiere.nome_progetto}</h3>
                            <p class="text-on-surface/70 text-sm mb-1">
                                <span class="material-symbols-outlined align-middle text-sm mr-1">location_on</span>
                                ${cantiere.indirizzo || 'Indirizzo non specificato'}
                            </p>
                            <p class="text-on-surface/70 text-sm mb-2">
                                <span class="material-symbols-outlined align-middle text-sm mr-1">work</span>
                                Ruolo: ${cantiere.ruolo_assegnato}
                            </p>
                        </div>
                        <span class="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                            ${cantiere.stato}
                        </span>
                    </div>

                    <!-- Progress Bars -->
                    <div class="space-y-3 mb-4">
                        <div>
                            <div class="flex justify-between text-sm mb-1">
                                <span>Progresso totale</span>
                                <span>${progressPercentage}%</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-primary h-2 rounded-full" style="width: ${progressPercentage}%"></div>
                            </div>
                        </div>
                        
                        <div>
                            <div class="flex justify-between text-sm mb-1">
                                <span>I miei tasks</span>
                                <span>${myCompletedTasks}/${myTasks.length}</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-secondary h-2 rounded-full" style="width: ${myProgressPercentage}%"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Task Summary -->
                    <div class="flex gap-4 text-sm text-on-surface/70 mb-4">
                        <span>
                            <span class="material-symbols-outlined align-middle text-sm mr-1">checklist</span>
                            ${completedTasks}/${totalTasks} completati
                        </span>
                        <span>
                            <span class="material-symbols-outlined align-middle text-sm mr-1">assignment</span>
                            ${myTasks.length} assegnati a me
                        </span>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex gap-2">
                        <button onclick="operatorPanel.openCantiereDetail('${cantiere.id}')" 
                                class="flex-1 bg-primary text-white px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm">
                            <span class="material-symbols-outlined align-middle mr-1">open_in_new</span>
                            Apri Cantiere
                        </button>
                        ${cantiere.drive_folder_id ? `
                            <button onclick="operatorPanel.openDriveFolder('${cantiere.drive_folder_id}')" 
                                    class="px-3 py-2 border border-outline/30 rounded-lg hover:bg-surface-container transition-colors text-sm"
                                    title="Apri cartella Drive">
                                <span class="material-symbols-outlined align-middle">folder</span>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    async openCantiereDetail(cantiereId) {
        const cantiere = this.assignedCantieri.find(c => c.id === cantiereId);
        if (!cantiere) return;

        this.currentCantiere = cantiere;
        this.renderCantiereDetail();
    }

    renderCantiereDetail() {
        const modal = document.getElementById('cantiere-detail-modal');
        if (!modal) return;

        // Group tasks by category
        const tasksByCategory = this.groupTasksByCategory(this.currentCantiere.cantiere_tasks || []);
        
        // Render tasks by category
        const tasksHtml = Object.entries(tasksByCategory).map(([category, tasks]) => `
            <div class="mb-6">
                <h4 class="text-lg font-semibold mb-3 capitalize">${category}</h4>
                <div class="space-y-2">
                    ${tasks.map(task => this.renderTaskItem(task)).join('')}
                </div>
            </div>
        `).join('');

        modal.innerHTML = `
            <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div class="bg-surface rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                    <div class="p-6">
                        <div class="flex justify-between items-center mb-6">
                            <div>
                                <h2 class="text-2xl font-bold">${this.currentCantiere.nome_progetto}</h2>
                                <p class="text-on-surface/70">${this.currentCantiere.indirizzo}</p>
                            </div>
                            <button onclick="operatorPanel.closeModal('cantiere-detail-modal')" 
                                    class="text-gray-500 hover:text-gray-700">
                                <span class="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <!-- Tasks Section -->
                            <div class="lg:col-span-2">
                                <h3 class="text-lg font-semibold mb-4">Tasks</h3>
                                <div class="space-y-4">
                                    ${tasksHtml || '<p class="text-gray-500">Nessun task disponibile</p>'}
                                </div>
                            </div>

                            <!-- Info Section -->
                            <div>
                                <h3 class="text-lg font-semibold mb-4">Informazioni Cantiere</h3>
                                <div class="space-y-3">
                                    <div>
                                        <label class="text-sm font-medium text-gray-600">Stato</label>
                                        <p class="capitalize">${this.currentCantiere.stato}</p>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-600">Data Inizio</label>
                                        <p>${this.currentCantiere.data_inizio ? new Date(this.currentCantiere.data_inizio).toLocaleDateString('it-IT') : 'Non specificata'}</p>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-600">Il Tuo Ruolo</label>
                                        <p class="capitalize">${this.currentCantiere.ruolo_assegnato}</p>
                                    </div>
                                    ${this.currentCantiere.riferimenti ? `
                                        <div>
                                            <label class="text-sm font-medium text-gray-600">Riferimenti</label>
                                            <p class="text-sm">${this.currentCantiere.riferimenti}</p>
                                        </div>
                                    ` : ''}
                                </div>

                                <!-- Documents Section -->
                                <div class="mt-6">
                                    <h3 class="text-lg font-semibold mb-4">Documenti</h3>
                                    ${this.currentCantiere.drive_folder_id ? `
                                        <div id="drive-files" class="space-y-2">
                                            <div class="text-center text-gray-500 py-4">
                                                <span class="material-symbols-outlined text-2xl mb-2">cloud</span>
                                                <p class="text-sm">Caricamento documenti...</p>
                                            </div>
                                        </div>
                                    ` : `
                                        <div class="text-center text-gray-500 py-4">
                                            <span class="material-symbols-outlined text-2xl mb-2">folder_off</span>
                                            <p class="text-sm">Nessuna cartella Drive configurata</p>
                                        </div>
                                    `}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Load Drive files if available
        if (this.currentCantiere.drive_folder_id) {
            this.loadDriveFiles();
        }
    }

    groupTasksByCategory(tasks) {
        const grouped = {};
        tasks.forEach(task => {
            const category = task.categoria || 'generale';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(task);
        });
        return grouped;
    }

    renderTaskItem(task) {
        const isAssignedToMe = task.assegnato_a === this.currentUser.id;
        const isCompleted = task.completato;
        const priorityColors = {
            alta: 'text-red-600 bg-red-50',
            media: 'text-yellow-600 bg-yellow-50',
            bassa: 'text-green-600 bg-green-50'
        };

        return `
            <div class="border rounded-lg p-3 ${isCompleted ? 'bg-gray-50 opacity-75' : 'bg-white'}">
                <div class="flex items-start justify-between">
                    <div class="flex items-start flex-1">
                        <input type="checkbox" 
                               class="task-checkbox mt-1 mr-3"
                               data-task-id="${task.id}"
                               ${isCompleted ? 'checked' : ''}
                               ${!isAssignedToMe ? 'disabled' : ''}>
                        <div class="flex-1">
                            <div class="font-medium ${isCompleted ? 'line-through text-gray-500' : ''}">${task.descrizione}</div>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="text-xs px-2 py-1 rounded ${priorityColors[task.priorita] || priorityColors.media}">
                                    ${task.priorita}
                                </span>
                                ${isAssignedToMe ? `
                                    <span class="text-xs text-green-600 font-medium">
                                        <span class="material-symbols-outlined align-middle text-xs">person</span>
                                        Assegnato a te
                                    </span>
                                ` : `
                                    <span class="text-xs text-gray-500">
                                        <span class="material-symbols-outlined align-middle text-xs">person_outline</span>
                                        Non assegnato a te
                                    </span>
                                `}
                            </div>
                            ${task.note ? `<p class="text-sm text-gray-600 mt-2">${task.note}</p>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async toggleTaskCompletion(taskId) {
        try {
            // Get current task state
            const { data: task, error: fetchError } = await this.supabase
                .from('cantiere_tasks')
                .select('completato, assegnato_a')
                .eq('id', taskId)
                .single();

            if (fetchError) throw fetchError;

            // Check if task is assigned to current user
            if (task.assegnato_a !== this.currentUser.id) {
                this.showError('Puoi completare solo i task assegnati a te');
                return;
            }

            // Toggle completion
            const { error } = await this.supabase
                .from('cantiere_tasks')
                .update({ completato: !task.completato })
                .eq('id', taskId);

            if (error) throw error;

            // Update local data
            const cantiere = this.assignedCantieri.find(c => c.id === this.currentCantiere.id);
            const taskIndex = cantiere.cantiere_tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                cantiere.cantiere_tasks[taskIndex].completato = !task.completato;
            }

            // Re-render the detail view
            this.renderCantiereDetail();
            this.renderCantieriList();

            this.showSuccess('Task aggiornato con successo');
        } catch (error) {
            console.error('Error toggling task:', error);
            this.showError('Errore nell\'aggiornamento del task');
        }
    }

    async loadDriveFiles() {
        if (!this.currentCantiere.drive_folder_id) return;

        try {
            // Use Google Drive integration
            if (window.driveIntegration) {
                await window.driveIntegration.loadAndRenderFiles(
                    this.currentCantiere.drive_folder_id, 
                    'drive-files'
                );
            } else {
                // Fallback placeholder
                const driveContainer = document.getElementById('drive-files');
                if (driveContainer) {
                    driveContainer.innerHTML = `
                        <div class="text-center text-gray-500 py-4">
                            <span class="material-symbols-outlined text-2xl mb-2">cloud</span>
                            <p class="text-sm">Integrazione Google Drive in caricamento...</p>
                            <button onclick="operatorPanel.openDriveFolder('${this.currentCantiere.drive_folder_id}')" 
                                    class="mt-2 text-primary hover:text-primary/80 text-sm underline">
                                Apri su Google Drive
                            </button>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Error loading Drive files:', error);
        }
    }

    openDriveFolder(folderId) {
        window.open(`https://drive.google.com/drive/folders/${folderId}`, '_blank');
    }

    filterCantieri(filterValue) {
        let filtered = [...this.assignedCantieri];

        switch (filterValue) {
            case 'completati':
                filtered = filtered.filter(c => 
                    c.cantiere_tasks?.every(t => t.completato) || false
                );
                break;
            case 'da-completare':
                filtered = filtered.filter(c => 
                    c.cantiere_tasks?.some(t => !t.completato) || false
                );
                break;
            case 'rilievo':
            case 'impiantistica':
            case 'sicurezza':
                filtered = filtered.filter(c => 
                    c.cantiere_tasks?.some(t => t.categoria === filterValue) || false
                );
                break;
        }

        this.renderFilteredCantieri(filtered);
    }

    searchCantieri(searchTerm) {
        const filtered = this.assignedCantieri.filter(c => 
            c.nome_progetto.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.indirizzo?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        this.renderFilteredCantieri(filtered);
    }

    renderFilteredCantieri(cantieri) {
        const container = document.getElementById('cantieri-container');
        if (!container) return;

        if (cantieri.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <span class="material-symbols-outlined text-6xl text-gray-300 mb-4">search_off</span>
                    <h3 class="text-xl font-semibold text-gray-600 mb-2">Nessun cantiere trovato</h3>
                    <p class="text-gray-500">Prova a modificare i filtri di ricerca.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                ${cantieri.map(cantiere => this.renderCantiereCard(cantiere)).join('')}
            </div>
        `;
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    showSuccess(message) {
        // Simple notification - you can replace with a better notification system
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showError(message) {
        // Simple notification - you can replace with a better notification system
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize the operator panel when DOM is ready
let operatorPanel;
document.addEventListener('DOMContentLoaded', () => {
    operatorPanel = new OperatorPanel();
});
