/**
 * Upload.js - Upload module
 * Handles file selection, drag-drop, validation, and upload
 */

class UploadModule {
    constructor() {
        this.selectedFiles = [];
        this.maxFiles = 10;
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
        this.allowedTypes = ['.pdf', '.txt', '.docx'];
        this.init();
    }

    init() {
        const dropzone = document.getElementById('dropzone');
        const fileInput = document.getElementById('fileInput');
        const uploadBtn = document.getElementById('uploadBtn');
        const clearFilesBtn = document.getElementById('clearFilesBtn');

        console.log('[UploadModule] Initializing - dropzone:', !!dropzone, 'fileInput:', !!fileInput, 'uploadBtn:', !!uploadBtn, 'clearFilesBtn:', !!clearFilesBtn);

        if (!dropzone || !fileInput || !uploadBtn || !clearFilesBtn) {
            console.error('[UploadModule] CRITICAL: Missing required DOM elements!');
            console.error('dropzone:', dropzone?.id || 'NOT FOUND');
            console.error('fileInput:', fileInput?.id || 'NOT FOUND');
            console.error('uploadBtn:', uploadBtn?.id || 'NOT FOUND');
            console.error('clearFilesBtn:', clearFilesBtn?.id || 'NOT FOUND');
            return;
        }

        console.log('[UploadModule] All elements found, attaching event listeners...');

        // Dropzone events
        dropzone.addEventListener('click', () => {
            console.log('[UploadModule] Dropzone clicked');
            fileInput.click();
        });
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            console.log('[UploadModule] Files dropped:', e.dataTransfer.files.length);
            this.handleFiles(e.dataTransfer.files);
        });

        // File input
        fileInput.addEventListener('change', (e) => {
            console.log('[UploadModule] Files selected:', e.target.files.length);
            this.handleFiles(e.target.files);
        });

        // Upload button
        uploadBtn.addEventListener('click', () => {
            console.log('[UploadModule] Upload button clicked');
            this.uploadFiles();
        });
        clearFilesBtn.addEventListener('click', () => {
            console.log('[UploadModule] Clear files button clicked');
            this.clearFiles();
        });
        
        console.log('[UploadModule] Initialization complete - all listeners attached');
    }

    handleFiles(files) {
        console.log('[UploadModule] handleFiles() called with', files.length, 'files');
        for (let file of files) {
            if (this.selectedFiles.length >= this.maxFiles) {
                utils.Notification.warning(`Maximum ${this.maxFiles} files allowed`);
                break;
            }

            if (file.size > this.maxFileSize) {
                utils.Notification.error(`File ${file.name} exceeds 50MB limit`);
                continue;
            }

            const ext = '.' + file.name.split('.').pop().toLowerCase();
            if (!this.allowedTypes.includes(ext)) {
                utils.Notification.error(`File type ${ext} not supported`);
                continue;
            }

            this.selectedFiles.push(file);
            console.log('[UploadModule] Added file:', file.name);
        }

        this.updateFileList();
    }

    updateFileList() {
        console.log('[UploadModule] updateFileList() - rendering', this.selectedFiles.length, 'files');
        const fileList = document.getElementById('fileList');
        utils.DOM.clear(fileList);

        this.selectedFiles.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'file-list-item';
            li.innerHTML = `
                <div class="file-list-item-info">
                    <div class="file-list-item-name">${file.name}</div>
                    <div class="file-list-item-size">${utils.DataFormatter.bytes(file.size)}</div>
                </div>
                <button class="file-list-item-remove" data-index="${index}">Remove</button>
            `;

            li.querySelector('.file-list-item-remove').addEventListener('click', () => {
                this.selectedFiles.splice(index, 1);
                this.updateFileList();
            });

            fileList.appendChild(li);
        });

        // Show/hide upload button
        const uploadBtn = document.getElementById('uploadBtn');
        if (this.selectedFiles.length > 0) {
            uploadBtn.disabled = false;
            uploadBtn.textContent = `Upload ${this.selectedFiles.length} File${this.selectedFiles.length > 1 ? 's' : ''}`;
        } else {
            uploadBtn.disabled = true;
            uploadBtn.textContent = 'Upload Files';
        }
    }

    async uploadFiles() {
        console.log('[UploadModule] uploadFiles() called with', this.selectedFiles.length, 'files');
        
        if (this.selectedFiles.length === 0) {
            utils.Notification.warning('Please select files first');
            return;
        }

        const titleInput = document.getElementById('materialTitle');
        const title = titleInput?.value?.trim();
        
        if (!title) {
            utils.Notification.warning('Please enter a material title');
            return;
        }

        const uploadBtn = document.getElementById('uploadBtn');
        const progressContainer = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('uploadProgressFill');
        const progressText = document.getElementById('uploadProgressText');

        uploadBtn.disabled = true;
        utils.DOM.show(progressContainer);

        try {
            const formData = new FormData();
            this.selectedFiles.forEach(file => {
                formData.append('files', file);
            });
            formData.append('title', title);

            console.log('[UploadModule] FormData created with', this.selectedFiles.length, 'files');

            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    progressFill.style.width = percentComplete + '%';
                    progressText.textContent = `Uploading... ${Math.round(percentComplete)}%`;
                    console.log('[UploadModule] Upload progress:', Math.round(percentComplete) + '%');
                }
            });

            xhr.addEventListener('load', () => {
                console.log('[UploadModule] XHR load event - status:', xhr.status);
                if (xhr.status === 200 || xhr.status === 201) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        console.log('[UploadModule] Upload response:', response);
                        if (response.success || response.material) {
                            utils.Notification.success(`Successfully uploaded "${title}" (${this.selectedFiles.length} file(s))`);
                            this.clearFiles();
                            document.getElementById('materialTitle').value = '';
                            progressFill.style.width = '100%';
                            
                            setTimeout(() => {
                                utils.DOM.hide(progressContainer);
                                progressFill.style.width = '0%';
                                
                                // Switch to generate tab after successful upload
                                const generateTab = document.querySelector('[data-tab="generate"]');
                                if (generateTab) {
                                    console.log('[UploadModule] Switching to generate tab');
                                    generateTab.click();
                                }
                            }, 1000);

                            // Reload materials if tabs exist
                            if (window.materialsModule) {
                                console.log('[UploadModule] Reloading materials module');
                                window.materialsModule.loadMaterials();
                            }
                            
                            // Also reload the generate module dropdown
                            if (window.generateModule) {
                                console.log('[UploadModule] Reloading generate module materials');
                                window.generateModule.loadMaterials();
                            }
                        } else {
                            throw new Error(response.error || 'Upload failed');
                        }
                    } catch (e) {
                        console.error('[UploadModule] Error parsing response:', e);
                        utils.Notification.error('Failed to parse upload response: ' + e.message);
                        uploadBtn.disabled = false;
                    }
                } else {
                    try {
                        const error = JSON.parse(xhr.responseText);
                        throw new Error(error.error || `Upload failed with status ${xhr.status}`);
                    } catch (e) {
                        console.error('[UploadModule] Upload error:', e.message);
                        utils.Notification.error(e.message);
                        uploadBtn.disabled = false;
                    }
                }
            });

            xhr.addEventListener('error', () => {
                console.error('[UploadModule] XHR error');
                utils.Notification.error('Upload failed. Please try again.');
                utils.DOM.hide(progressContainer);
                uploadBtn.disabled = false;
            });

            console.log('[UploadModule] Sending XHR to /api/materials/upload-combined');
            xhr.open('POST', '/api/materials/upload-combined');
            xhr.send(formData);

        } catch (error) {
            console.error('[UploadModule] Catch block:', error);
            utils.Notification.error(error.message);
            uploadBtn.disabled = false;
            utils.DOM.hide(progressContainer);
        }
    }

    clearFiles() {
        this.selectedFiles = [];
        document.getElementById('fileInput').value = '';
        this.updateFileList();
        utils.DOM.hide(document.getElementById('uploadProgress'));
    }
}
