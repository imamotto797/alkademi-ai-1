/**
 * Generate.js - Generation module
 * Handles content generation from materials with various types and providers
 */

class GenerateModule {
    constructor() {
        this.currentType = 'summary';
        this.providerDetails = {
            gemini: { name: 'Google Gemini', color: '#4285F4', models: ['gemini-pro'], quota: '60 req/min' },
            openai: { name: 'OpenAI GPT-4', color: '#10A37F', models: ['gpt-4'], quota: '200 req/day' },
            anthropic: { name: 'Anthropic Claude', color: '#0A4A8F', models: ['claude-3-opus'], quota: '100 req/min' },
            nvidia: { name: 'NVIDIA', color: '#76B900', models: ['nvidia/llama2-70b'], quota: '4K tokens/min' },
            deepseek: { name: 'DeepSeek', color: '#FF6B35', models: ['deepseek-chat'], quota: '32K tokens/min' },
            qwen: { name: 'Qwen', color: '#FF6B35', models: ['qwen-turbo'], quota: '32K tokens/min' },
        };
        this.init();
        
        // Track module view
        api.trackEvent('module_view', { module: 'generate' }).catch(console.error);
    }

    init() {
        console.log('[GenerateModule] Initializing...');
        if (!document.getElementById('generationType')) {
            console.warn('[GenerateModule] generationType element not found - skipping init');
            return;
        }

        // Generation type buttons
        document.querySelectorAll('.generation-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.generation-type-btn').forEach(b => 
                    b.classList.remove('active')
                );
                e.target.closest('.generation-type-btn').classList.add('active');
                this.currentType = e.target.closest('.generation-type-btn').dataset.type;
                document.getElementById('generationType').value = this.currentType;
            });
        });

        // Provider selection
        const aiProvider = document.getElementById('aiProvider');
        aiProvider.addEventListener('change', () => this.updateProviderInfo());

        // Load materials
        this.loadMaterials();

        // Generate button
        document.getElementById('generateBtn').addEventListener('click', () => this.generate());
        document.getElementById('clearGenerateBtn').addEventListener('click', () => this.clearForm());

        // Results actions
        document.getElementById('copyResultsBtn').addEventListener('click', () => this.copyResults());
        document.getElementById('downloadResultsBtn').addEventListener('click', () => this.downloadResults());
        document.getElementById('newGenerationBtn').addEventListener('click', () => {
            utils.DOM.hide(document.getElementById('generationResults'));
            document.getElementById('resultsContent').innerHTML = '';
        });

        // Initial provider info
        this.updateProviderInfo();
        console.log('[GenerateModule] Initialization complete');
    }

    async loadMaterials() {
        try {
            console.log('[GenerateModule] Loading materials for dropdown...');
            const response = await api.getMaterials();
            console.log('[GenerateModule] Materials response:', response);
            
            // Extract materials array from response
            const materialsArray = response.materials || response.data || [];
            const select = document.getElementById('materialSelect');
            
            // Clear existing options except the default
            while (select.options.length > 1) {
                select.remove(1);
            }
            
            // Add materials to dropdown - use 'title' field, not 'name'
            materialsArray.forEach(material => {
                const option = document.createElement('option');
                option.value = material.id;
                option.textContent = material.title || material.name || 'Untitled';
                select.appendChild(option);
                console.log('[GenerateModule] Added material:', material.title || material.name);
            });
            
            console.log('[GenerateModule] Loaded', materialsArray.length, 'materials into dropdown');
        } catch (error) {
            console.error('[GenerateModule] Failed to load materials:', error);
            utils.Notification.error('Failed to load materials: ' + error.message);
        }
    }

    updateProviderInfo() {
        const provider = document.getElementById('aiProvider').value;
        const details = this.providerDetails[provider];
        const infoDiv = document.getElementById('providerDetails');

        if (details) {
            infoDiv.innerHTML = `
                <div class="provider-badge" style="background: ${details.color}20; border-left: 4px solid ${details.color};">
                    <div style="color: ${details.color}; font-weight: bold;">${details.name}</div>
                    <div style="font-size: 12px; color: #666;">Models: ${details.models.join(', ')}</div>
                    <div style="font-size: 12px; color: #666;">Quota: ${details.quota}</div>
                </div>
            `;
        }
    }

    async generate() {
        const materialId = document.getElementById('materialSelect').value;
        const provider = document.getElementById('aiProvider').value;
        const generationType = document.getElementById('generationType').value;
        const style = document.getElementById('styleSelect').value;
        const level = document.getElementById('levelSelect').value;
        const focusAreas = document.getElementById('customPrompt').value;

        if (!materialId) {
            utils.Notification.warning('Please select a material');
            return;
        }

        // Track generation start
        api.trackEvent('generation_start', {
            materialId: materialId,
            provider: provider,
            generationType: generationType,
            style: style,
            level: level
        }).catch(console.error);

        const loading = document.getElementById('generationLoading');
        const error = document.getElementById('generationError');
        const results = document.getElementById('generationResults');

        utils.DOM.show(loading);
        utils.DOM.hide(error);
        utils.DOM.hide(results);

        document.getElementById('loadingProvider').textContent = 
            this.providerDetails[provider]?.name || provider;
        document.getElementById('generateBtn').disabled = true;

        // Animate loading steps
        this.animateLoadingSteps();
        
        const startTime = Date.now();

        try {
            // Map education level to target audience description
            const audienceMap = {
                'sd': 'elementary school students (ages 6-12)',
                'smp': 'junior high school students (ages 13-15)',
                'sma': 'senior high school students (ages 16-18)',
                'undergraduate': 'undergraduate students',
                'graduate': 'graduate students',
                'professional': 'professionals and practitioners'
            };
            
            const options = {
                targetAudience: audienceMap[level] || 'students',
                style: style,
                depth: level === 'sd' ? 'beginner' : level === 'smp' ? 'intermediate' : 'advanced',
                focusAreas: focusAreas ? focusAreas.split(',').map(f => f.trim()) : [],
                length: 'comprehensive',
                generationType: generationType,
                aiProvider: provider,
                aiModel: 'auto'
            };

            console.log('[GenerateModule] Generating with options:', options);
            const response = await api.generateMaterials(materialId, options);
            
            // Track successful generation
            const duration = Date.now() - startTime;
            api.trackEvent('generation_complete', {
                materialId: materialId,
                provider: provider,
                generationType: generationType,
                duration: duration,
                contentLength: response.material?.content?.length || response.content?.length || 0,
                success: true
            }).catch(console.error);
            
            this.displayResults(response);
            utils.Notification.success('Content generated successfully!');

        } catch (error) {
            // Track failed generation
            const duration = Date.now() - startTime;
            api.trackEvent('generation_complete', {
                materialId: materialId,
                provider: provider,
                generationType: generationType,
                duration: duration,
                success: false,
                error: error.message
            }).catch(console.error);
            
            const errorMsg = error.message || 'Generation failed';
            document.getElementById('generationError').textContent = errorMsg;
            utils.DOM.show(document.getElementById('generationError'));
            utils.Notification.error(errorMsg);
        } finally {
            // Clear loading animation interval
            if (this.loadingInterval) {
                clearInterval(this.loadingInterval);
                this.loadingInterval = null;
            }
            utils.DOM.hide(loading);
            document.getElementById('generateBtn').disabled = false;
        }
    }

    displayResults(data) {
        const resultsContent = document.getElementById('resultsContent');
        utils.DOM.clear(resultsContent);

        // Handle backend response format - extract content from material object
        let content = '';
        
        if (data.material && data.material.content) {
            content = data.material.content;
        } else if (data.content) {
            content = data.content;
        } else if (typeof data === 'string') {
            content = data;
        }
        
        console.log('[GenerateModule] displayResults - content length:', content.length);

        if (content) {
            let html = '';

            // Try to parse as JSON array first
            try {
                const parsed = JSON.parse(content);
                if (Array.isArray(parsed)) {
                    parsed.forEach((item, index) => {
                        html += `
                            <div class="result-item">
                                <div class="result-item-number">${index + 1}</div>
                                <div class="result-item-content">
                                    ${typeof item === 'string' ? item : JSON.stringify(item, null, 2)}
                                </div>
                            </div>
                        `;
                    });
                } else {
                    // JSON object, display as formatted text
                    html = `<div class="result-item-content" style="white-space: pre-wrap; line-height: 1.6;">${JSON.stringify(parsed, null, 2)}</div>`;
                }
            } catch (e) {
                // If not JSON, treat as plain text
                html = `<div class="result-item-content" style="white-space: pre-wrap; line-height: 1.6;">${content}</div>`;
            }

            resultsContent.innerHTML = html;
            console.log('[GenerateModule] Results displayed');
        } else {
            resultsContent.innerHTML = '<p style="color: red;">No content generated</p>';
            console.warn('[GenerateModule] No content in response');
        }

        // Store results for download
        this.lastResults = { content: content };
        utils.DOM.show(document.getElementById('generationResults'));
    }

    copyResults() {
        if (!this.lastResults) return;

        let text = '';
        if (Array.isArray(this.lastResults.content)) {
            text = this.lastResults.content.map((item, i) => `${i + 1}. ${item}`).join('\n\n');
        } else {
            text = this.lastResults.content;
        }

        navigator.clipboard.writeText(text).then(() => {
            utils.Notification.success('Copied to clipboard!');
        }).catch(() => {
            utils.Notification.error('Failed to copy');
        });
    }

    downloadResults() {
        if (!this.lastResults) return;

        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `generation_${this.currentType}_${timestamp}.txt`;
        
        let text = `Generation Results - ${this.currentType.toUpperCase()}\n`;
        text += `Generated: ${new Date().toLocaleString()}\n`;
        text += `=${'='.repeat(50)}\n\n`;

        if (Array.isArray(this.lastResults.content)) {
            text += this.lastResults.content.map((item, i) => `${i + 1}. ${item}`).join('\n\n');
        } else {
            text += this.lastResults.content;
        }

        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);

        utils.Notification.success('File downloaded!');
    }

    animateLoadingSteps() {
        const steps = document.querySelectorAll('.status-step');
        steps.forEach((step, index) => {
            step.classList.remove('active');
        });
        
        let currentStep = 0;
        const stepInterval = setInterval(() => {
            if (currentStep > 0) {
                steps[currentStep - 1].classList.remove('active');
            }
            if (currentStep < steps.length) {
                steps[currentStep].classList.add('active');
                currentStep++;
            } else {
                currentStep = 0; // Loop back
            }
        }, 2000);
        
        // Store interval ID to clear it later
        this.loadingInterval = stepInterval;
    }

    clearForm() {
        document.getElementById('materialSelect').value = '';
        document.getElementById('customPrompt').value = '';
        document.getElementById('styleSelect').value = 'academic';
        document.getElementById('levelSelect').value = 'undergraduate';
        document.getElementById('aiProvider').value = 'gemini';
        this.currentType = 'learning_materials';
        document.getElementById('generationType').value = 'learning_materials';
        document.querySelectorAll('.generation-type-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('[data-type="learning_materials"]')?.classList.add('active');
        this.updateProviderInfo();
    }
}
