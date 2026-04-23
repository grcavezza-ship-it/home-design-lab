// Home Design Lab - File Upload System
// Sistema completo per upload, gestione e organizzazione file

class FileUploadManager {
    constructor() {
        this.supabase = null;
        this.currentProject = null;
        this.uploadQueue = [];
        this.isUploading = false;
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
        this.allowedTypes = [
            'image/jpeg', 'image/png', 'image/webp', 'image/gif',
            'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain', 'text/csv',
            'application/zip', 'application/x-zip-compressed',
            'image/dwg', 'image/dxf', 'application/acad', 'application/x-acad'
        ];
        this.init();
    }

    init() {
        this.setupUI();
        this.setupEventListeners();
        this.initializeSupabase();
    }

    initializeSupabase() {
        // Attendi che Supabase sia disponibile
        const checkSupabase = setInterval(() => {
            if (window.supabaseClient && window.supabaseClient.isInitialized) {
                this.supabase = window.supabaseClient;
                clearInterval(checkSupabase);
            }
        }, 100);
    }

    setupUI() {
        // Crea UI upload se non esiste
        if (!document.querySelector('[data-upload-container]')) {
            const uploadHTML = `
                <div class="upload-modal fixed inset-0 bg-black/50 z-50 hidden" data-upload-modal>
                    <div class="relative h-full flex items-center justify-center p-4">
                        <div class="bg-surface rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" data-upload-container>
                            <!-- Header -->
                            <div class="p-6 border-b border-outline-variant/20 flex justify-between items-center">
                                <div>
                                    <h2 class="text-2xl font-headline text-on-surface">Carica Documenti</h2>
                                    <p class="text-on-surface-variant text-sm mt-1">Upload file per progetto: <span data-current-project-name></span></p>
                                </div>
                                <button class="p-2 hover:bg-surface-container rounded-lg transition-colors" data-upload-close>
                                    <span class="material-symbols-outlined text-on-surface-variant">close</span>
                                </button>
                            </div>
                            
                            <!-- Upload Area -->
                            <div class="flex-1 overflow-y-auto p-6">
                                <div class="upload-zone border-2 border-dashed border-outline-variant/30 rounded-xl p-12 text-center hover:border-primary/50 transition-colors cursor-pointer" data-upload-zone>
                                    <div class="mb-6">
                                        <span class="material-symbols-outlined text-6xl text-primary">cloud_upload</span>
                                    </div>
                                    <h3 class="text-lg font-semibold text-on-surface mb-2">Trascina i file qui</h3>
                                    <p class="text-on-surface-variant text-sm mb-4">o clicca per selezionare</p>
                                    <p class="text-xs text-on-surface-variant/60">
                                        Formati supportati: PDF, DOC, XLS, PPT, JPG, PNG, DWG, DXF<br>
                                        Dimensione massima: 50MB per file
                                    </p>
                                    <input type="file" multiple class="hidden" data-file-input accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.gif,.dwg,.dxf,.txt,.csv,.zip">
                                </div>

                                <!-- File Queue -->
                                <div class="mt-8 hidden" data-upload-queue>
                                    <h3 class="text-lg font-semibold text-on-surface mb-4">File in coda</h3>
                                    <div class="space-y-3" data-queue-items></div>
                                </div>

                                <!-- Metadata Form -->
                                <div class="mt-8 hidden" data-metadata-form>
                                    <h3 class="text-lg font-semibold text-on-surface mb-4">Dettagli Documenti</h3>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6" data-metadata-fields></div>
                                </div>
                            </div>

                            <!-- Footer -->
                            <div class="p-6 border-t border-outline-variant/20 flex justify-between items-center">
                                <div class="text-sm text-on-surface-variant">
                                    <span data-queue-count>0</span> file selezionati
                                </div>
                                <div class="flex gap-3">
                                    <button class="px-6 py-2 border border-outline-variant/30 rounded-lg hover:bg-surface-container transition-colors" data-upload-cancel>
                                        Annulla
                                    </button>
                                    <button class="px-6 py-2 bg-primary text-on-primary rounded-lg hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed" data-upload-confirm disabled>
                                        Carica File
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', uploadHTML);
        }
    }

    setupEventListeners() {
        // Upload zone events
        const uploadZone = document.querySelector('[data-upload-zone]');
        const fileInput = document.querySelector('[data-file-input]');
        
        if (uploadZone && fileInput) {
            // Click to open file dialog
            uploadZone.addEventListener('click', () => fileInput.click());
            
            // Drag and drop
            uploadZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadZone.classList.add('border-primary', 'bg-primary/5');
            });
            
            uploadZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                uploadZone.classList.remove('border-primary', 'bg-primary/5');
            });
            
            uploadZone.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadZone.classList.remove('border-primary', 'bg-primary/5');
                this.handleFiles(e.dataTransfer.files);
            });
            
            // File selection
            fileInput.addEventListener('change', (e) => {
                this.handleFiles(e.target.files);
            });
        }

        // Modal controls
        const closeBtn = document.querySelector('[data-upload-close]');
        const cancelBtn = document.querySelector('[data-upload-cancel]');
        const confirmBtn = document.querySelector('[data-upload-confirm]');

        if (closeBtn) closeBtn.addEventListener('click', () => this.closeUploadModal());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeUploadModal());
        if (confirmBtn) confirmBtn.addEventListener('click', () => this.startUpload());

        // Modal backdrop click
        const modal = document.querySelector('[data-upload-modal]');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeUploadModal();
            });
        }
    }

    openUploadModal(projectId, projectName) {
        this.currentProject = { id: projectId, name: projectName };
        this.uploadQueue = [];
        
        const modal = document.querySelector('[data-upload-modal]');
        const projectNameEl = document.querySelector('[data-current-project-name]');
        
        if (modal) modal.classList.remove('hidden');
        if (projectNameEl) projectNameEl.textContent = projectName;
        
        this.updateUI();
    }

    closeUploadModal() {
        const modal = document.querySelector('[data-upload-modal]');
        if (modal) modal.classList.add('hidden');
        
        // Reset state
        this.uploadQueue = [];
        this.currentProject = null;
        this.updateUI();
    }

    handleFiles(files) {
        const validFiles = Array.from(files).filter(file => this.validateFile(file));
        
        if (validFiles.length === 0) {
            this.showError('Nessun file valido selezionato');
            return;
        }
        
        // Add to queue
        validFiles.forEach(file => {
            this.uploadQueue.push({
                id: Date.now() + Math.random(),
                file: file,
                metadata: {
                    title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
                    description: '',
                    file_type: this.getFileType(file),
                    is_public: false
                },
                status: 'pending',
                progress: 0,
                error: null
            });
        });
        
        this.updateUI();
        this.showMetadataForm();
    }

    validateFile(file) {
        // Check file size
        if (file.size > this.maxFileSize) {
            this.showError(`File ${file.name} troppo grande (max 50MB)`);
            return false;
        }
        
        // Check file type
        if (!this.allowedTypes.includes(file.type)) {
            this.showError(`File ${file.name} non supportato`);
            return false;
        }
        
        return true;
    }

    getFileType(file) {
        const typeMap = {
            'image/jpeg': 'photo',
            'image/png': 'photo',
            'image/webp': 'photo',
            'image/gif': 'photo',
            'application/pdf': 'document',
            'application/msword': 'document',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
            'application/vnd.ms-excel': 'document',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
            'application/vnd.ms-powerpoint': 'presentation',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'presentation',
            'text/plain': 'document',
            'text/csv': 'document',
            'application/zip': 'other',
            'application/x-zip-compressed': 'other',
            'image/dwg': 'plan',
            'image/dxf': 'plan',
            'application/acad': 'plan',
            'application/x-acad': 'plan'
        };
        
        return typeMap[file.type] || 'other';
    }

    showMetadataForm() {
        const metadataForm = document.querySelector('[data-metadata-form]');
        const metadataFields = document.querySelector('[data-metadata-fields]');
        
        if (!metadataForm || !metadataFields) return;
        
        metadataForm.classList.remove('hidden');
        
        // Generate metadata fields for each file
        let fieldsHTML = '';
        this.uploadQueue.forEach((item, index) => {
            fieldsHTML += `
                <div class="border border-outline-variant/20 rounded-lg p-4">
                    <h4 class="font-medium text-on-surface mb-3">${item.file.name}</h4>
                    <div class="space-y-3">
                        <div>
                            <label class="block text-sm font-medium text-on-surface mb-1">Titolo</label>
                            <input type="text" 
                                   class="w-full px-3 py-2 border border-outline-variant/30 rounded-lg focus:outline-none focus:border-primary" 
                                   value="${item.metadata.title}"
                                   data-metadata-title="${index}"
                                   placeholder="Titolo documento">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-on-surface mb-1">Descrizione</label>
                            <textarea class="w-full px-3 py-2 border border-outline-variant/30 rounded-lg focus:outline-none focus:border-primary" 
                                      rows="2"
                                      data-metadata-description="${index}"
                                      placeholder="Descrizione opzionale">${item.metadata.description}</textarea>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-sm font-medium text-on-surface mb-1">Tipo</label>
                                <select class="w-full px-3 py-2 border border-outline-variant/30 rounded-lg focus:outline-none focus:border-primary" 
                                        data-metadata-type="${index}">
                                    <option value="plan" ${item.metadata.file_type === 'plan' ? 'selected' : ''}>Planimetria</option>
                                    <option value="render" ${item.metadata.file_type === 'render' ? 'selected' : ''}>Render</option>
                                    <option value="photo" ${item.metadata.file_type === 'photo' ? 'selected' : ''}>Foto</option>
                                    <option value="contract" ${item.metadata.file_type === 'contract' ? 'selected' : ''}>Contratto</option>
                                    <option value="invoice" ${item.metadata.file_type === 'invoice' ? 'selected' : ''}>Fattura</option>
                                    <option value="technical" ${item.metadata.file_type === 'technical' ? 'selected' : ''}>Tecnico</option>
                                    <option value="presentation" ${item.metadata.file_type === 'presentation' ? 'selected' : ''}>Presentazione</option>
                                    <option value="other" ${item.metadata.file_type === 'other' ? 'selected' : ''}>Altro</option>
                                </select>
                            </div>
                            <div class="flex items-center">
                                <label class="flex items-center cursor-pointer">
                                    <input type="checkbox" 
                                           class="mr-2"
                                           data-metadata-public="${index}"
                                           ${item.metadata.is_public ? 'checked' : ''}>
                                    <span class="text-sm text-on-surface">Visibile al cliente</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        metadataFields.innerHTML = fieldsHTML;
        
        // Setup event listeners for metadata fields
        metadataFields.addEventListener('input', (e) => {
            const index = parseInt(e.target.dataset.metadataTitle || e.target.dataset.metadataDescription || e.target.dataset.metadataType);
            if (!isNaN(index)) {
                if (e.target.dataset.metadataTitle) {
                    this.uploadQueue[index].metadata.title = e.target.value;
                } else if (e.target.dataset.metadataDescription) {
                    this.uploadQueue[index].metadata.description = e.target.value;
                } else if (e.target.dataset.metadataType) {
                    this.uploadQueue[index].metadata.file_type = e.target.value;
                }
            }
        });
        
        metadataFields.addEventListener('change', (e) => {
            if (e.target.dataset.metadataPublic) {
                const index = parseInt(e.target.dataset.metadataPublic);
                if (!isNaN(index)) {
                    this.uploadQueue[index].metadata.is_public = e.target.checked;
                }
            }
        });
    }

    updateUI() {
        // Update queue count
        const queueCount = document.querySelector('[data-queue-count]');
        if (queueCount) queueCount.textContent = this.uploadQueue.length;
        
        // Show/hide queue section
        const queueSection = document.querySelector('[data-upload-queue]');
        if (queueSection) {
            queueSection.classList.toggle('hidden', this.uploadQueue.length === 0);
        }
        
        // Update queue items
        const queueItems = document.querySelector('[data-queue-items]');
        if (queueItems) {
            let itemsHTML = '';
            this.uploadQueue.forEach(item => {
                const statusIcon = this.getStatusIcon(item.status);
                const statusColor = this.getStatusColor(item.status);
                
                itemsHTML += `
                    <div class="flex items-center gap-4 p-3 bg-surface-container rounded-lg">
                        <div class="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <span class="material-symbols-outlined text-primary">${statusIcon}</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="font-medium text-on-surface truncate">${item.file.name}</p>
                            <p class="text-sm text-on-surface-variant">${this.formatFileSize(item.file.size)}</p>
                            ${item.status === 'uploading' ? `
                                <div class="w-full bg-surface-container rounded-full h-1.5 mt-2">
                                    <div class="bg-primary h-1.5 rounded-full transition-all duration-300" style="width: ${item.progress}%"></div>
                                </div>
                            ` : ''}
                            ${item.error ? `
                                <p class="text-sm text-error mt-1">${item.error}</p>
                            ` : ''}
                        </div>
                        <button class="p-1 hover:bg-surface-container-high rounded transition-colors" data-remove-item="${item.id}">
                            <span class="material-symbols-outlined text-on-surface-variant">close</span>
                        </button>
                    </div>
                `;
            });
            queueItems.innerHTML = itemsHTML;
            
            // Setup remove buttons
            queueItems.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-remove-item]');
                if (btn) {
                    const itemId = parseFloat(btn.dataset.removeItem);
                    this.uploadQueue = this.uploadQueue.filter(item => item.id !== itemId);
                    this.updateUI();
                }
            });
        }
        
        // Enable/disable confirm button
        const confirmBtn = document.querySelector('[data-upload-confirm]');
        if (confirmBtn) {
            const hasValidFiles = this.uploadQueue.some(item => item.status === 'pending');
            confirmBtn.disabled = !hasValidFiles || this.isUploading;
        }
    }

    getStatusIcon(status) {
        const icons = {
            pending: 'upload_file',
            uploading: 'sync',
            completed: 'check_circle',
            error: 'error'
        };
        return icons[status] || 'upload_file';
    }

    getStatusColor(status) {
        const colors = {
            pending: 'text-on-surface-variant',
            uploading: 'text-primary',
            completed: 'text-success',
            error: 'text-error'
        };
        return colors[status] || 'text-on-surface-variant';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async startUpload() {
        if (!this.supabase || !this.currentProject) {
            this.showError('Supabase non inizializzato o progetto non selezionato');
            return;
        }
        
        this.isUploading = true;
        this.updateUI();
        
        const pendingFiles = this.uploadQueue.filter(item => item.status === 'pending');
        
        try {
            // Upload files sequentially
            for (const item of pendingFiles) {
                item.status = 'uploading';
                item.progress = 0;
                this.updateUI();
                
                try {
                    await this.uploadFile(item);
                    item.status = 'completed';
                    item.progress = 100;
                } catch (error) {
                    item.status = 'error';
                    item.error = error.message;
                }
                
                this.updateUI();
            }
            
            // Show success message
            const completedCount = this.uploadQueue.filter(item => item.status === 'completed').length;
            if (completedCount > 0) {
                this.showSuccess(`${completedCount} file caricati con successo`);
                
                // Close modal after delay
                setTimeout(() => this.closeUploadModal(), 2000);
            }
            
        } catch (error) {
            this.showError('Errore durante il caricamento: ' + error.message);
        } finally {
            this.isUploading = false;
            this.updateUI();
        }
    }

    async uploadFile(item) {
        try {
            // Update metadata from form
            const titleInput = document.querySelector(`[data-metadata-title="${this.uploadQueue.indexOf(item)}"]`);
            const descInput = document.querySelector(`[data-metadata-description="${this.uploadQueue.indexOf(item)}"]`);
            const typeInput = document.querySelector(`[data-metadata-type="${this.uploadQueue.indexOf(item)}"]`);
            const publicInput = document.querySelector(`[data-metadata-public="${this.uploadQueue.indexOf(item)}"]`);
            
            if (titleInput) item.metadata.title = titleInput.value;
            if (descInput) item.metadata.description = descInput.value;
            if (typeInput) item.metadata.file_type = typeInput.value;
            if (publicInput) item.metadata.is_public = publicInput.checked;
            
            // Upload via Supabase client
            await this.supabase.uploadDocument(
                item.file,
                this.currentProject.id,
                item.metadata
            );
            
        } catch (error) {
            console.error('Upload error:', error);
            throw new Error('Upload fallito: ' + error.message);
        }
    }

    showError(message) {
        // Implement error notification
        console.error(message);
        // TODO: Implement proper notification system
    }

    showSuccess(message) {
        // Implement success notification
        console.log(message);
        // TODO: Implement proper notification system
    }
}

// Inizializzazione globale
document.addEventListener('DOMContentLoaded', () => {
    window.fileUploadManager = new FileUploadManager();
});

// Esporta per uso globale
window.FileUploadManager = FileUploadManager;
