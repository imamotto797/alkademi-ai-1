/**
 * Materials.js - Materials module
 * Handles displaying, searching, and managing materials
 */

class MaterialsModule {
    constructor() {
        this.materials = [];
        this.filteredMaterials = [];
        this.currentMaterial = null;
        this.init();
        
        // Track module view
        api.trackEvent('module_view', { module: 'materials' }).catch(console.error);
    }

    init() {
        console.log('[MaterialsModule] Initializing...');
        if (!document.getElementById('materialsContainer')) {
            console.warn('[MaterialsModule] materialsContainer element not found - skipping init');
            return;
        }

        // Search functionality
        const searchInput = document.getElementById('materialsSearch');
        searchInput.addEventListener('input', (e) => this.searchMaterials(e.target.value));

        // Modal close buttons
        document.getElementById('closeModalBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('closeModalBtn2').addEventListener('click', () => this.closeModal());

        // Delete button
        document.getElementById('deleteMaterialBtn').addEventListener('click', () => this.deleteMaterial());

        // Load materials
        this.loadMaterials();
        console.log('[MaterialsModule] Initialization complete');
    }

    async loadMaterials() {
        const container = document.getElementById('materialsContainer');
        const loading = document.getElementById('materialsLoading');
        const noMaterials = document.getElementById('noMaterials');

        utils.DOM.show(loading);
        utils.DOM.hide(container);
        utils.DOM.hide(noMaterials);

        try {
            const response = await api.getMaterials();
            console.log('[MaterialsModule] API response:', response);
            
            // Handle response - may be { success, materials } or { materials }
            const materialsArray = response.materials || response.data || [];
            this.materials = Array.isArray(materialsArray) ? materialsArray : [];
            this.filteredMaterials = [...this.materials];
            
            console.log('[MaterialsModule] Loaded', this.materials.length, 'materials');

            if (this.materials.length === 0) {
                utils.DOM.hide(container);
                utils.DOM.show(noMaterials);
                console.log('[MaterialsModule] No materials to display');
            } else {
                this.renderMaterials();
                utils.DOM.show(container);
                utils.DOM.hide(noMaterials);
                console.log('[MaterialsModule] Rendered', this.materials.length, 'materials');
            }
        } catch (error) {
            console.error('[MaterialsModule] Failed to load materials:', error);
            utils.Notification.error('Failed to load materials: ' + error.message);
        } finally {
            utils.DOM.hide(loading);
        }
    }

    renderMaterials() {
        const container = document.getElementById('materialsContainer');
        utils.DOM.clear(container);

        this.filteredMaterials.forEach(material => {
            const card = this.createMaterialCard(material);
            container.appendChild(card);
        });
    }

    createMaterialCard(material) {
        const div = document.createElement('div');
        div.className = 'material-card';
        
        const uploadDate = utils.DateFormatter.relative(material.created_at);
        const description = material.source_type === 'generated' ? 'Generated Material' : 'Source Material';

        div.innerHTML = `
            <div class="material-card-header">
                <h3>${utils.DataFormatter.truncate(material.title, 40)}</h3>
                <div class="material-card-actions">
                    <button class="material-card-action" title="View details">👁️</button>
                    <button class="material-card-action" title="Delete">🗑️</button>
                </div>
            </div>
            <div class="material-card-body">
                <p class="material-card-description">${description}</p>
                <div class="material-card-meta">
                    <span>📅 ${uploadDate}</span>
                </div>
            </div>
        `;

        // Event listeners
        const viewBtn = div.querySelector('.material-card-actions .material-card-action:first-child');
        const deleteBtn = div.querySelector('.material-card-actions .material-card-action:last-child');

        // Open generated materials in a dedicated detail page for better UX
        if (material.source_type === 'generated') {
            viewBtn.addEventListener('click', () => {
                window.location.href = `/html/materialDetail.html?id=${material.id}`;
            });
        } else {
            viewBtn.addEventListener('click', () => this.showMaterialDetail(material));
        }

        deleteBtn.addEventListener('click', () => this.confirmDelete(material));

        // Make entire card clickable for convenience (skip clicks on action buttons)
        div.addEventListener('click', (e) => {
            if (e.target.closest('.material-card-actions')) return;
            if (material.source_type === 'generated') {
                window.location.href = `/html/materialDetail.html?id=${material.id}`;
            } else {
                this.showMaterialDetail(material);
            }
        });

        return div;
    }

    showMaterialDetail(material) {
        this.currentMaterial = material;
        
        // Track material view
        api.trackEvent('material_view', {
            materialId: material.id,
            title: material.title,
            sourceType: material.source_type
        }).catch(console.error);
        
        const title = document.getElementById('materialModalTitle');
        const body = document.getElementById('materialModalBody');
        const modal = document.getElementById('materialModal');

        title.textContent = material.title;

        const materialType = material.source_type === 'generated' ? 'Generated Material' : 'Source Material';

        body.innerHTML = `
            <div class="material-detail">
                <div class="detail-section">
                    <h4>Type</h4>
                    <p>${materialType}</p>
                </div>

                <div class="detail-section">
                    <h4>Content</h4>
                    <div style="max-height: 400px; overflow-y: auto; padding: 12px; background: #f5f5f5; border-radius: 4px;">
                        <pre style="white-space: pre-wrap; word-wrap: break-word; font-family: inherit; margin: 0;">${material.content}</pre>
                    </div>
                </div>

                <div class="detail-section">
                    <h4>Metadata</h4>
                    <div>
                        <strong>ID:</strong> ${material.id}<br>
                        <strong>Created:</strong> ${utils.DateFormatter.format(material.created_at, 'long')}<br>
                        ${material.updated_at ? `<strong>Updated:</strong> ${utils.DateFormatter.format(material.updated_at, 'long')}<br>` : ''}
                    </div>
                </div>

                ${material.source_type === 'generated' ? `
                    <div class="detail-section">
                        <h4>Feedback</h4>
                        <textarea placeholder="Add refinement feedback..." style="width: 100%; height: 80px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" id="feedbackText"></textarea>
                        <div style="margin-top: 8px; display: flex; gap: 8px;">
                            <button id="submitFeedbackBtn" class="primary" style="padding: 6px 12px;">Submit Feedback</button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        if (material.source_type === 'generated') {
            document.getElementById('submitFeedbackBtn').addEventListener('click', () => this.submitFeedback());
        }
        
        modal.style.display = 'flex';

        // Log access
        api.logMaterialAccess(material.id).catch(console.error);
    }

    async submitFeedback() {
        const rating = parseInt(document.getElementById('feedbackRating').value);
        const feedback = document.getElementById('feedbackText').value;

        if (!feedback) {
            utils.Notification.warning('Please enter feedback');
            return;
        }

        try {
            await api.refineMaterials(this.currentMaterial.id, feedback);
            utils.Notification.success('Feedback submitted!');
            document.getElementById('feedbackText').value = '';
            this.loadMaterials();
        } catch (error) {
            utils.Notification.error('Failed to submit feedback');
        }
    }

    confirmDelete(material) {
        const title = (material && (material.title || material.name)) ? (material.title || material.name) : 'this material';
        if (confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
            this.deleteMaterial(material);
        }
    }

    async deleteMaterial(material) {
        if (!material && this.currentMaterial) {
            material = this.currentMaterial;
        }

        if (!material) return;

        try {
            await api.deleteMaterial(material.id);
            utils.Notification.success('Material deleted successfully');
            this.closeModal();
            this.loadMaterials();
        } catch (error) {
            utils.Notification.error('Failed to delete material');
        }
    }

    searchMaterials(query) {
        query = query.toLowerCase();
        
        this.filteredMaterials = this.materials.filter(material => 
            material.name.toLowerCase().includes(query) ||
            (material.description && material.description.toLowerCase().includes(query))
        );

        // Track search event
        api.trackEvent('materials_search', {
            query: query,
            resultsCount: this.filteredMaterials.length
        }).catch(console.error);

        this.renderMaterials();

        if (this.filteredMaterials.length === 0) {
            const container = document.getElementById('materialsContainer');
            container.innerHTML = '<div class="empty-state"><p>No materials found matching your search</p></div>';
        }
    }

    closeModal() {
        const modal = document.getElementById('materialModal');
        modal.style.display = 'none';
        this.currentMaterial = null;
    }
}
