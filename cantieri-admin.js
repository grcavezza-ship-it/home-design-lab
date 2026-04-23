// Construction Site Management System - Admin Panel
// React component for managing construction sites and tasks

class CantieriAdmin {
    constructor() {
        this.supabase = null;
        this.currentCantiere = null;
        this.operatori = [];
        this.cantieri = [];
        this.init();
    }

    async init() {
        // Initialize Supabase client
        this.supabase = window.supabase || supabase;
        
        // Load initial data
        await this.loadOperatori();
        await this.loadCantieri();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Render initial UI
        this.renderCantieriList();
    }

    async loadOperatori() {
        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .select('*')
                .in('role', ['user', 'architect'])
                .order('full_name');

            if (error) throw error;
            this.operatori = data || [];
        } catch (error) {
            console.error('Error loading operatori:', error);
            this.showError('Errore nel caricamento degli operatori');
        }
    }

    async loadCantieri() {
        try {
            const { data, error } = await this.supabase
                .from('cantieri')
                .select(`
                    *,
                    profiles:creato_da(full_name),
                    cantieri_assegnazioni(
                        operatori_profiles:operatore_id(full_name, role)
                    ),
                    cantiere_tasks(count)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            this.cantieri = data || [];
        } catch (error) {
            console.error('Error loading cantieri:', error);
            this.showError('Errore nel caricamento dei cantieri');
        }
    }

    setupEventListeners() {
        // Form submissions
        document.getElementById('cantiere-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCantiere();
        });

        // Task form
        document.getElementById('task-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTask();
        });

        // Assignment form
        document.getElementById('assignment-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveAssignment();
        });
    }

    renderCantieriList() {
        const container = document.getElementById('cantieri-list');
        if (!container) return;

        container.innerHTML = `
            <div class="mb-6 flex justify-between items-center">
                <h2 class="text-2xl font-bold text-primary">Gestione Cantieri</h2>
                <button onclick="cantieriAdmin.showCantiereForm()" 
                        class="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                    <span class="material-symbols-outlined align-middle mr-2">add</span>
                    Nuovo Cantiere
                </button>
            </div>
            
            <div class="grid gap-4">
                ${this.cantieri.map(cantiere => this.renderCantiereCard(cantiere)).join('')}
            </div>
        `;
    }

    renderCantiereCard(cantiere) {
        const operatoriAssegnati = cantiere.cantieri_assegnazioni?.map(ca => ca.operatori_profiles.full_name).join(', ') || 'Nessuno';
        const tasksCount = cantiere.cantiere_tasks?.[0]?.count || 0;
        const statusColor = cantiere.stato === 'attivo' ? 'text-green-600' : 
                          cantiere.stato === 'completato' ? 'text-blue-600' : 'text-orange-600';

        return `
            <div class="bg-surface-container rounded-lg p-6 shadow-sm border border-outline/20">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-xl font-semibold mb-2">${cantiere.nome_progetto}</h3>
                        <p class="text-on-surface/70 text-sm mb-1">
                            <span class="material-symbols-outlined align-middle text-sm mr-1">location_on</span>
                            ${cantiere.indirizzo || 'Indirizzo non specificato'}
                        </p>
                        <p class="text-on-surface/70 text-sm mb-1">
                            <span class="material-symbols-outlined align-middle text-sm mr-1">calendar_today</span>
                            ${cantiere.data_inizio ? new Date(cantiere.data_inizio).toLocaleDateString('it-IT') : 'Data non specificata'}
                        </p>
                        <p class="text-on-surface/70 text-sm">
                            <span class="material-symbols-outlined align-middle text-sm mr-1">people</span>
                            Operatori: ${operatoriAssegnati}
                        </p>
                    </div>
                    <div class="text-right">
                        <span class="${statusColor} font-medium">${cantiere.stato.toUpperCase()}</span>
                        <div class="mt-2 space-x-2">
                            <button onclick="cantieriAdmin.editCantiere('${cantiere.id}')" 
                                    class="text-primary hover:text-primary/80 text-sm">
                                <span class="material-symbols-outlined align-middle">edit</span>
                            </button>
                            <button onclick="cantieriAdmin.deleteCantiere('${cantiere.id}')" 
                                    class="text-red-600 hover:text-red-800 text-sm">
                                <span class="material-symbols-outlined align-middle">delete</span>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="flex justify-between items-center pt-4 border-t border-outline/20">
                    <div class="flex gap-4 text-sm text-on-surface/70">
                        <span>
                            <span class="material-symbols-outlined align-middle text-sm mr-1">checklist</span>
                            ${tasksCount} tasks
                        </span>
                        ${cantiere.drive_folder_id ? `
                            <span>
                                <span class="material-symbols-outlined align-middle text-sm mr-1">folder</span>
                                Drive integrato
                            </span>
                        ` : ''}
                    </div>
                    <button onclick="cantieriAdmin.openCantiereDetail('${cantiere.id}')" 
                            class="bg-secondary text-white px-3 py-1 rounded text-sm hover:bg-secondary/90">
                        Gestisci
                    </button>
                </div>
            </div>
        `;
    }

    showCantiereForm(cantiere = null) {
        this.currentCantiere = cantiere;
        const modal = document.getElementById('cantiere-modal');
        const form = document.getElementById('cantiere-form');
        
        if (!modal || !form) return;

        // Populate form if editing
        if (cantiere) {
            form.nome_progetto.value = cantiere.nome_progetto || '';
            form.indirizzo.value = cantiere.indirizzo || '';
            form.data_inizio.value = cantiere.data_inizio || '';
            form.drive_folder_id.value = cantiere.drive_folder_id || '';
            form.riferimenti.value = cantiere.riferimenti || '';
            form.stato.value = cantiere.stato || 'attivo';
        } else {
            form.reset();
        }

        modal.classList.remove('hidden');
    }

    async saveCantiere() {
        const form = document.getElementById('cantiere-form');
        const formData = new FormData(form);
        
        const cantiereData = {
            nome_progetto: formData.get('nome_progetto'),
            indirizzo: formData.get('indirizzo'),
            data_inizio: formData.get('data_inizio') || null,
            drive_folder_id: formData.get('drive_folder_id') || null,
            riferimenti: formData.get('riferimenti'),
            stato: formData.get('stato'),
            creato_da: (await this.supabase.auth.getUser()).data.user.id
        };

        try {
            let result;
            if (this.currentCantiere) {
                // Update existing cantiere
                result = await this.supabase
                    .from('cantieri')
                    .update(cantiereData)
                    .eq('id', this.currentCantiere.id);
            } else {
                // Create new cantiere
                result = await this.supabase
                    .from('cantieri')
                    .insert([cantiereData]);
            }

            if (result.error) throw result.error;

            this.showSuccess('Cantiere salvato con successo');
            this.closeModal('cantiere-modal');
            await this.loadCantieri();
            this.renderCantieriList();
        } catch (error) {
            console.error('Error saving cantiere:', error);
            this.showError('Errore nel salvataggio del cantiere');
        }
    }

    async deleteCantiere(cantiereId) {
        if (!confirm('Sei sicuro di voler eliminare questo cantiere?')) return;

        try {
            const { error } = await this.supabase
                .from('cantieri')
                .delete()
                .eq('id', cantiereId);

            if (error) throw error;

            this.showSuccess('Cantiere eliminato con successo');
            await this.loadCantieri();
            this.renderCantieriList();
        } catch (error) {
            console.error('Error deleting cantiere:', error);
            this.showError('Errore nell\'eliminazione del cantiere');
        }
    }

    async openCantiereDetail(cantiereId) {
        const cantiere = this.cantieri.find(c => c.id === cantiereId);
        if (!cantiere) return;

        this.currentCantiere = cantiere;
        
        // Load tasks and assignments for this cantiere
        await this.loadTasks(cantiereId);
        await this.loadAssignments(cantiereId);
        
        // Show detail modal
        this.renderCantiereDetail();
    }

    async loadTasks(cantiereId) {
        try {
            const { data, error } = await this.supabase
                .from('cantiere_tasks')
                .select(`
                    *,
                    operatori_profiles:assegnato_a(full_name)
                `)
                .eq('cantiere_id', cantiereId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            this.currentTasks = data || [];
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.currentTasks = [];
        }
    }

    async loadAssignments(cantiereId) {
        try {
            const { data, error } = await this.supabase
                .from('cantieri_assegnazioni')
                .select(`
                    *,
                    operatori_profiles:operatore_id(full_name, role)
                `)
                .eq('cantiere_id', cantiereId);

            if (error) throw error;
            this.currentAssignments = data || [];
        } catch (error) {
            console.error('Error loading assignments:', error);
            this.currentAssignments = [];
        }
    }

    renderCantiereDetail() {
        const modal = document.getElementById('cantiere-detail-modal');
        if (!modal) return;

        const tasksHtml = this.currentTasks?.map(task => this.renderTaskCard(task)).join('') || '<p class="text-gray-500">Nessun task</p>';
        const assignmentsHtml = this.currentAssignments?.map(assignment => this.renderAssignmentCard(assignment)).join('') || '<p class="text-gray-500">Nessun operatore assegnato</p>';
        
        const assignedOperatorIds = this.currentAssignments?.map(a => a.operatore_id) || [];

        modal.innerHTML = `
            <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div class="bg-surface rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                    <div class="p-6">
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="text-2xl font-bold">${this.currentCantiere.nome_progetto}</h2>
                            <button onclick="cantieriAdmin.closeModal('cantiere-detail-modal')" 
                                    class="text-gray-500 hover:text-gray-700">
                                <span class="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <!-- Tasks Section -->
                            <div>
                                <div class="flex justify-between items-center mb-4">
                                    <h3 class="text-lg font-semibold">Tasks</h3>
                                    <button onclick="cantieriAdmin.showTaskForm()" 
                                            class="bg-primary text-white px-3 py-1 rounded text-sm hover:bg-primary/90">
                                        <span class="material-symbols-outlined align-middle mr-1">add</span>
                                        Nuovo Task
                                    </button>
                                </div>
                                <div class="space-y-3">
                                    ${tasksHtml}
                                </div>
                            </div>

                            <!-- Assignments Section -->
                            <div>
                                <div class="flex justify-between items-center mb-4">
                                    <h3 class="text-lg font-semibold">Operatori Assegnati</h3>
                                    <button onclick="cantieriAdmin.showAssignmentForm()" 
                                            class="bg-primary text-white px-3 py-1 rounded text-sm hover:bg-primary/90">
                                        <span class="material-symbols-outlined align-middle mr-1">person_add</span>
                                        Assegna Operatore
                                    </button>
                                </div>
                                <div class="space-y-3">
                                    ${assignmentsHtml}
                                </div>
                            </div>
                        </div>

                        <!-- Google Drive Section -->
                        <div class="mt-6 pt-6 border-t">
                            <h3 class="text-lg font-semibold mb-4">Documenti Google Drive</h3>
                            ${this.currentCantiere.drive_folder_id ? `
                                <div id="drive-files" class="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <div class="text-center text-gray-500 py-8 col-span-full">
                                        <span class="material-symbols-outlined text-4xl mb-2">folder_open</span>
                                        <p>Caricamento documenti...</p>
                                    </div>
                                </div>
                            ` : `
                                <div class="text-center text-gray-500 py-8">
                                    <span class="material-symbols-outlined text-4xl mb-2">folder_off</span>
                                    <p>Nessuna cartella Google Drive configurata</p>
                                    <button onclick="cantieriAdmin.editCantiere('${this.currentCantiere.id}')" 
                                            class="mt-2 text-primary hover:text-primary/80 text-sm">
                                        Configura ora
                                    </button>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Load Drive files if folder is configured
        if (this.currentCantiere.drive_folder_id) {
            this.loadDriveFiles();
        }
    }

    renderTaskCard(task) {
        const completedClass = task.completato ? 'bg-green-50 border-green-200' : 'bg-white';
        const assignedTo = task.operatori_profiles?.full_name || 'Non assegnato';

        return `
            <div class="${completedClass} border rounded-lg p-3">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="flex items-center mb-1">
                            <input type="checkbox" 
                                   ${task.completato ? 'checked' : ''} 
                                   onchange="cantieriAdmin.toggleTask('${task.id}')"
                                   class="mr-2">
                            <span class="font-medium ${task.completato ? 'line-through text-gray-500' : ''}">${task.descrizione}</span>
                        </div>
                        <div class="text-sm text-gray-600">
                            <span class="material-symbols-outlined align-middle text-xs mr-1">person</span>
                            ${assignedTo}
                            <span class="mx-2">·</span>
                            <span class="material-symbols-outlined align-middle text-xs mr-1">flag</span>
                            ${task.priorita}
                        </div>
                    </div>
                    <button onclick="cantieriAdmin.deleteTask('${task.id}')" 
                            class="text-red-500 hover:text-red-700 text-sm">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </div>
            </div>
        `;
    }

    renderAssignmentCard(assignment) {
        return `
            <div class="bg-white border rounded-lg p-3">
                <div class="flex justify-between items-center">
                    <div>
                        <div class="font-medium">${assignment.operatori_profiles.full_name}</div>
                        <div class="text-sm text-gray-600">${assignment.ruolo}</div>
                    </div>
                    <button onclick="cantieriAdmin.removeAssignment('${assignment.id}')" 
                            class="text-red-500 hover:text-red-700 text-sm">
                        <span class="material-symbols-outlined">person_remove</span>
                    </button>
                </div>
            </div>
        `;
    }

    async toggleTask(taskId) {
        const task = this.currentTasks.find(t => t.id === taskId);
        if (!task) return;

        try {
            const { error } = await this.supabase
                .from('cantiere_tasks')
                .update({ completato: !task.completato })
                .eq('id', taskId);

            if (error) throw error;

            await this.loadTasks(this.currentCantiere.id);
            this.renderCantiereDetail();
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
                        <div class="text-center text-gray-500 py-8 col-span-full">
                            <span class="material-symbols-outlined text-4xl mb-2">cloud</span>
                            <p>Integrazione Google Drive in caricamento...</p>
                            <p class="text-sm mt-2">Folder ID: ${this.currentCantiere.drive_folder_id}</p>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Error loading Drive files:', error);
        }
    }

    showTaskForm(task = null) {
        const modal = document.getElementById('task-modal');
        const form = document.getElementById('task-form');
        
        if (!modal || !form) return;

        // Populate operator options
        const operatoriOptions = this.operatori.map(op => 
            `<option value="${op.user_id}">${op.full_name}</option>`
        ).join('');

        form.operatore_id.innerHTML = '<option value="">Seleziona operatore</option>' + operatoriOptions;

        if (task) {
            form.descrizione.value = task.descrizione;
            form.categoria.value = task.categoria;
            form.priorita.value = task.priorita;
            form.operatore_id.value = task.assegnato_a || '';
            form.note.value = task.note || '';
        } else {
            form.reset();
        }

        modal.classList.remove('hidden');
    }

    async saveTask() {
        const form = document.getElementById('task-form');
        const formData = new FormData(form);
        
        const taskData = {
            cantiere_id: this.currentCantiere.id,
            descrizione: formData.get('descrizione'),
            categoria: formData.get('categoria'),
            priorita: formData.get('priorita'),
            assegnato_a: formData.get('operatore_id') || null,
            note: formData.get('note')
        };

        try {
            const { error } = await this.supabase
                .from('cantiere_tasks')
                .insert([taskData]);

            if (error) throw error;

            this.showSuccess('Task creato con successo');
            this.closeModal('task-modal');
            await this.loadTasks(this.currentCantiere.id);
            this.renderCantiereDetail();
        } catch (error) {
            console.error('Error saving task:', error);
            this.showError('Errore nel salvataggio del task');
        }
    }

    async deleteTask(taskId) {
        if (!confirm('Sei sicuro di voler eliminare questo task?')) return;

        try {
            const { error } = await this.supabase
                .from('cantiere_tasks')
                .delete()
                .eq('id', taskId);

            if (error) throw error;

            this.showSuccess('Task eliminato con successo');
            await this.loadTasks(this.currentCantiere.id);
            this.renderCantiereDetail();
        } catch (error) {
            console.error('Error deleting task:', error);
            this.showError('Errore nell\'eliminazione del task');
        }
    }

    showAssignmentForm() {
        const modal = document.getElementById('assignment-modal');
        const form = document.getElementById('assignment-form');
        
        if (!modal || !form) return;

        // Populate operator options (exclude already assigned)
        const assignedOperatorIds = this.currentAssignments?.map(a => a.operatore_id) || [];
        const availableOperatori = this.operatori.filter(op => !assignedOperatorIds.includes(op.user_id));
        
        const operatoriOptions = availableOperatori.map(op => 
            `<option value="${op.user_id}">${op.full_name}</option>`
        ).join('');

        form.operatore_id.innerHTML = '<option value="">Seleziona operatore</option>' + operatoriOptions;

        modal.classList.remove('hidden');
    }

    async saveAssignment() {
        const form = document.getElementById('assignment-form');
        const formData = new FormData(form);
        
        const assignmentData = {
            cantiere_id: this.currentCantiere.id,
            operatore_id: formData.get('operatore_id'),
            ruolo: formData.get('ruolo')
        };

        try {
            const { error } = await this.supabase
                .from('cantieri_assegnazioni')
                .insert([assignmentData]);

            if (error) throw error;

            this.showSuccess('Operatore assegnato con successo');
            this.closeModal('assignment-modal');
            await this.loadAssignments(this.currentCantiere.id);
            this.renderCantiereDetail();
        } catch (error) {
            console.error('Error saving assignment:', error);
            this.showError('Errore nell\'assegnazione dell\'operatore');
        }
    }

    async removeAssignment(assignmentId) {
        if (!confirm('Sei sicuro di voler rimuovere questa assegnazione?')) return;

        try {
            const { error } = await this.supabase
                .from('cantieri_assegnazioni')
                .delete()
                .eq('id', assignmentId);

            if (error) throw error;

            this.showSuccess('Assegnazione rimossa con successo');
            await this.loadAssignments(this.currentCantiere.id);
            this.renderCantiereDetail();
        } catch (error) {
            console.error('Error removing assignment:', error);
            this.showError('Errore nella rimozione dell\'assegnazione');
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    showSuccess(message) {
        // Simple notification - you can replace with a better notification system
        alert(message);
    }

    showError(message) {
        // Simple notification - you can replace with a better notification system
        alert('Errore: ' + message);
    }
}

// Initialize the admin panel when DOM is ready
let cantieriAdmin;
document.addEventListener('DOMContentLoaded', () => {
    cantieriAdmin = new CantieriAdmin();
});
