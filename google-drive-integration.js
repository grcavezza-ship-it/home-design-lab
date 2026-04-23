// Google Drive API Integration for Construction Site Management
// This module handles Google Drive file listing and viewing

class GoogleDriveIntegration {
    constructor() {
        this.apiKey = null;
        this.clientId = null;
        this.isInitialized = false;
        this.tokenClient = null;
        this.accessToken = null;
        this.init();
    }

    async init() {
        // Load Google API configuration from environment or config
        await this.loadConfig();
        
        // Initialize Google API
        if (this.apiKey && this.clientId) {
            await this.initializeGoogleApi();
        }
    }

    async loadConfig() {
        try {
            // Try to load from config file first
            const response = await fetch('./config.js');
            const config = await response.json();
            
            this.apiKey = config.googleApiKey;
            this.clientId = config.googleClientId;
            
            // Fallback to environment variables if config doesn't have Google settings
            if (!this.apiKey) {
                this.apiKey = process.env.GOOGLE_API_KEY;
            }
            if (!this.clientId) {
                this.clientId = process.env.GOOGLE_CLIENT_ID;
            }
        } catch (error) {
            console.warn('Could not load Google Drive config:', error);
        }
    }

    async initializeGoogleApi() {
        try {
            // Load Google API script
            await this.loadGoogleApiScript();
            
            // Initialize GIS (Google Identity Services)
            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: this.clientId,
                scope: 'https://www.googleapis.com/auth/drive.readonly',
                callback: (tokenResponse) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        this.accessToken = tokenResponse.access_token;
                        this.isInitialized = true;
                        console.log('Google Drive API initialized successfully');
                    }
                },
            });
            
            this.isInitialized = true;
        } catch (error) {
            console.error('Error initializing Google API:', error);
        }
    }

    loadGoogleApiScript() {
        return new Promise((resolve, reject) => {
            if (window.gapi) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = () => {
                gapi.load('client', () => {
                    gapi.client.init({
                        apiKey: this.apiKey,
                        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                    }).then(() => {
                        resolve();
                    }).catch(reject);
                });
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async authenticate() {
        if (!this.tokenClient) {
            throw new Error('Google Drive API not initialized');
        }

        return new Promise((resolve, reject) => {
            this.tokenClient.callback = (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    this.accessToken = tokenResponse.access_token;
                    resolve(tokenResponse.access_token);
                } else {
                    reject(new Error('Authentication failed'));
                }
            };

            this.tokenClient.requestAccessToken();
        });
    }

    async listFiles(folderId, maxResults = 50) {
        if (!this.accessToken) {
            await this.authenticate();
        }

        try {
            const response = await gapi.client.drive.files.list({
                q: `'${folderId}' in parents and trashed=false`,
                fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,thumbnailLink)',
                pageSize: maxResults,
                orderBy: 'folder,name,modifiedTime desc'
            });

            return response.result.files || [];
        } catch (error) {
            console.error('Error listing files:', error);
            
            // Try to re-authenticate if token expired
            if (error.status === 401) {
                await this.authenticate();
                return this.listFiles(folderId, maxResults);
            }
            
            throw error;
        }
    }

    async getFile(fileId) {
        if (!this.accessToken) {
            await this.authenticate();
        }

        try {
            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                fields: 'id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,thumbnailLink'
            });

            return response.result;
        } catch (error) {
            console.error('Error getting file:', error);
            throw error;
        }
    }

    async downloadFile(fileId, fileName) {
        if (!this.accessToken) {
            await this.authenticate();
        }

        try {
            // Get download URL
            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                fields: 'webContentLink'
            });

            const downloadUrl = response.result.webContentLink;
            
            // Create download link
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = fileName;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error downloading file:', error);
            throw error;
        }
    }

    renderFileList(files, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!files || files.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <span class="material-symbols-outlined text-4xl mb-2">folder_open</span>
                    <p>Nessun file trovato in questa cartella</p>
                </div>
            `;
            return;
        }

        const filesHtml = files.map(file => this.renderFileCard(file)).join('');
        
        container.innerHTML = `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                ${filesHtml}
            </div>
        `;
    }

    renderFileCard(file) {
        const icon = this.getFileIcon(file.mimeType);
        const size = this.formatFileSize(file.size);
        const date = new Date(file.modifiedTime).toLocaleDateString('it-IT');
        
        const isGoogleDoc = file.mimeType.startsWith('application/vnd.google-apps');
        const viewUrl = isGoogleDoc ? file.webViewLink : file.webContentLink;
        
        return `
            <div class="bg-white border border-outline/20 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center">
                        <span class="material-symbols-outlined text-2xl mr-3 ${icon.color}">
                            ${icon.name}
                        </span>
                        <div>
                            <h4 class="font-medium text-sm truncate max-w-[200px]" title="${file.name}">
                                ${file.name}
                            </h4>
                            <p class="text-xs text-gray-500">${size} · ${date}</p>
                        </div>
                    </div>
                </div>
                
                <div class="flex gap-2">
                    <button onclick="driveIntegration.viewFile('${file.id}', '${file.name.replace(/'/g, "\\'")}')" 
                            class="flex-1 bg-primary text-white px-3 py-1 rounded text-xs hover:bg-primary/90 transition-colors">
                        <span class="material-symbols-outlined align-middle text-sm mr-1">visibility</span>
                        Visualizza
                    </button>
                    ${!isGoogleDoc ? `
                        <button onclick="driveIntegration.downloadFile('${file.id}', '${file.name.replace(/'/g, "\\'")}')" 
                                class="px-3 py-1 border border-outline/30 rounded text-xs hover:bg-surface-container transition-colors">
                            <span class="material-symbols-outlined align-middle text-sm">download</span>
                        </button>
                    ` : `
                        <button onclick="driveIntegration.openInGoogleDocs('${file.webViewLink}')" 
                                class="px-3 py-1 border border-outline/30 rounded text-xs hover:bg-surface-container transition-colors">
                            <span class="material-symbols-outlined align-middle text-sm">open_in_new</span>
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    getFileIcon(mimeType) {
        const iconMap = {
            'application/pdf': { name: 'picture_as_pdf', color: 'text-red-600' },
            'application/vnd.google-apps.document': { name: 'description', color: 'text-blue-600' },
            'application/vnd.google-apps.spreadsheet': { name: 'table_chart', color: 'text-green-600' },
            'application/vnd.google-apps.presentation': { name: 'slideshow', color: 'text-orange-600' },
            'application/vnd.google-apps.folder': { name: 'folder', color: 'text-yellow-600' },
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { name: 'description', color: 'text-blue-600' },
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { name: 'table_chart', color: 'text-green-600' },
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': { name: 'slideshow', color: 'text-orange-600' },
            'image/jpeg': { name: 'image', color: 'text-purple-600' },
            'image/png': { name: 'image', color: 'text-purple-600' },
            'image/gif': { name: 'image', color: 'text-purple-600' },
            'text/plain': { name: 'text_snippet', color: 'text-gray-600' },
            'application/zip': { name: 'folder_zip', color: 'text-gray-600' }
        };

        return iconMap[mimeType] || { name: 'insert_drive_file', color: 'text-gray-600' };
    }

    formatFileSize(bytes) {
        if (!bytes) return 'N/A';
        
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    viewFile(fileId, fileName) {
        // Create modal to view file
        const modal = document.createElement('div');
        modal.id = 'file-view-modal';
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-surface rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
                <div class="p-4 border-b border-outline/20 flex justify-between items-center">
                    <h3 class="text-lg font-semibold">${fileName}</h3>
                    <button onclick="this.closest('.fixed').remove()" 
                            class="text-gray-500 hover:text-gray-700">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="p-4 overflow-auto" style="max-height: calc(90vh - 80px);">
                    <div class="flex items-center justify-center h-96">
                        <div class="text-center">
                            <span class="material-symbols-outlined text-4xl text-gray-400 mb-4">visibility</span>
                            <p class="text-gray-600 mb-4">Anteprima non disponibile</p>
                            <button onclick="driveIntegration.downloadFile('${fileId}', '${fileName.replace(/'/g, "\\'")}')"
                                    class="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90">
                                <span class="material-symbols-outlined align-middle mr-2">download</span>
                                Scarica File
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    openInGoogleDocs(url) {
        window.open(url, '_blank');
    }

    // Method to be called from other components
    async loadAndRenderFiles(folderId, containerId) {
        try {
            if (!this.isInitialized) {
                // Show setup message if not initialized
                const container = document.getElementById(containerId);
                if (container) {
                    container.innerHTML = `
                        <div class="text-center text-gray-500 py-8">
                            <span class="material-symbols-outlined text-4xl mb-2">cloud_off</span>
                            <p class="mb-4">Integrazione Google Drive non configurata</p>
                            <button onclick="driveIntegration.setupGoogleDrive()" 
                                    class="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90">
                                Configura Google Drive
                            </button>
                        </div>
                    `;
                }
                return;
            }

            // Show loading state
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
                    <div class="text-center text-gray-500 py-8">
                        <span class="material-symbols-outlined text-4xl mb-2">cloud</span>
                        <p>Caricamento documenti da Google Drive...</p>
                    </div>
                `;
            }

            const files = await this.listFiles(folderId);
            this.renderFileList(files, containerId);
            
        } catch (error) {
            console.error('Error loading Drive files:', error);
            
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
                    <div class="text-center text-red-500 py-8">
                        <span class="material-symbols-outlined text-4xl mb-2">error</span>
                        <p>Errore nel caricamento dei documenti</p>
                        <button onclick="driveIntegration.loadAndRenderFiles('${folderId}', '${containerId}')" 
                                class="mt-2 text-primary hover:text-primary/80 text-sm underline">
                            Riprova
                        </button>
                    </div>
                `;
            }
        }
    }

    setupGoogleDrive() {
        // Show setup instructions
        const modal = document.createElement('div');
        modal.id = 'drive-setup-modal';
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-surface rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold">Configurazione Google Drive</h2>
                        <button onclick="this.closest('.fixed').remove()" 
                                class="text-gray-500 hover:text-gray-700">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 class="font-semibold text-blue-800 mb-2">Passaggi per configurare Google Drive:</h3>
                            <ol class="list-decimal list-inside space-y-2 text-blue-700">
                                <li>Vai alla <a href="https://console.cloud.google.com/" target="_blank" class="underline">Google Cloud Console</a></li>
                                <li>Crea un nuovo progetto o seleziona uno esistente</li>
                                <li>Abilita l'API Google Drive</li>
                                <li>Crea delle credenziali OAuth 2.0</li>
                                <li>Aggiungi l'ID client e la chiave API al file config.js</li>
                            </ol>
                        </div>
                        
                        <div class="bg-gray-50 rounded-lg p-4">
                            <h3 class="font-semibold mb-2">Esempio di configurazione in config.js:</h3>
                            <pre class="bg-gray-800 text-gray-100 p-3 rounded text-sm overflow-x-auto"><code>{
  "supabaseUrl": "your-supabase-url",
  "supabaseAnonKey": "your-supabase-key",
  "googleClientId": "your-google-client-id.apps.googleusercontent.com",
  "googleApiKey": "your-google-api-key"
}</code></pre>
                        </div>
                        
                        <div class="flex justify-end space-x-3 pt-4">
                            <button onclick="location.reload()" 
                                    class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                                Ricarica Pagina
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
}

// Initialize the Google Drive integration
let driveIntegration;
document.addEventListener('DOMContentLoaded', () => {
    driveIntegration = new GoogleDriveIntegration();
});
