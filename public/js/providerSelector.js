/**
 * Provider Selector - Enhanced UI component for provider selection
 */
class ProviderSelector {
    constructor() {
        this.providers = {
            gemini: { 
                name: 'Google Gemini', 
                color: '#4285F4', 
                icon: '🤖',
                models: ['gemini-pro'],
                quota: '60 req/min',
                speed: 'Fast',
                cost: 'Free tier available',
                description: 'Latest multimodal AI model'
            },
            openai: { 
                name: 'OpenAI GPT-4', 
                color: '#10A37F', 
                icon: '🧠',
                models: ['gpt-4', 'gpt-3.5-turbo'],
                quota: '200 req/day',
                speed: 'Very Fast',
                cost: 'Paid',
                description: 'State-of-the-art language model'
            },
            anthropic: { 
                name: 'Anthropic Claude', 
                color: '#0A4A8F', 
                icon: '🎯',
                models: ['claude-3-opus', 'claude-3-sonnet'],
                quota: '100 req/min',
                speed: 'Fast',
                cost: 'Paid',
                description: 'Constitutional AI approach'
            },
            nvidia: { 
                name: 'NVIDIA NIM', 
                color: '#76B900', 
                icon: '⚡',
                models: ['nvidia/llama2-70b'],
                quota: '4K tokens/min',
                speed: 'Very Fast',
                cost: 'Free tier available',
                description: 'High-performance inference'
            },
            deepseek: { 
                name: 'DeepSeek', 
                color: '#FF6B35', 
                icon: '🔍',
                models: ['deepseek-chat'],
                quota: '32K tokens/min',
                speed: 'Fast',
                cost: 'Affordable',
                description: 'Cost-effective alternative'
            },
            qwen: { 
                name: 'Alibaba Qwen', 
                color: '#FF6B35', 
                icon: '🌟',
                models: ['qwen-turbo', 'qwen-plus'],
                quota: '32K tokens/min',
                speed: 'Very Fast',
                cost: 'Affordable',
                description: 'Powerful multilingual model'
            }
        };
    }

    /**
     * Create provider card element
     */
    createProviderCard(providerId, selected = false) {
        const provider = this.providers[providerId];
        const card = document.createElement('div');
        card.className = `provider-card ${selected ? 'selected' : ''}`;
        card.dataset.provider = providerId;
        card.style.cursor = 'pointer';

        const badgeColor = selected ? 'white' : provider.color;
        const badgeOpacity = selected ? '1' : '0.7';

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                <div>
                    <div style="font-size: 24px; margin-bottom: 5px;">${provider.icon}</div>
                    <div class="provider-name" style="color: ${selected ? 'white' : provider.color};">${provider.name}</div>
                </div>
                ${selected ? '<div style="font-size: 20px;">✓</div>' : ''}
            </div>
            
            <div style="font-size: 12px; line-height: 1.4; margin-bottom: 10px; opacity: ${selected ? '1' : '0.8'};">
                <div style="margin-bottom: 6px;">${provider.description}</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-weight: 500;">
                    <div>⚙️ Speed: ${provider.speed}</div>
                    <div>💰 ${provider.cost}</div>
                </div>
            </div>

            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid ${selected ? 'rgba(255,255,255,0.2)' : 'var(--border-color)'};">
                <div class="provider-quota" style="opacity: ${selected ? '1' : '0.7'}; color: ${selected ? 'white' : 'inherit'};">
                    📊 Quota: ${provider.quota}
                </div>
                <div class="quota-gauge" style="margin-top: 6px; background: ${selected ? 'rgba(255,255,255,0.2)' : 'var(--bg-primary)'};">
                    <div class="quota-gauge-fill" style="width: 65%;"></div>
                </div>
            </div>
        `;

        if (selected) {
            card.style.background = provider.color;
            card.style.color = 'white';
        }

        return card;
    }

    /**
     * Create full provider selector grid
     */
    createProviderGrid(selectedProvider = 'gemini', onSelect = null) {
        const container = document.createElement('div');
        container.className = 'provider-grid';
        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(280px, 1fr))';
        container.style.gap = '15px';
        container.style.marginBottom = '20px';

        Object.keys(this.providers).forEach(providerId => {
            const card = this.createProviderCard(providerId, providerId === selectedProvider);
            card.addEventListener('click', () => {
                // Update selection
                container.querySelectorAll('.provider-card').forEach(c => {
                    c.classList.remove('selected');
                    const pid = c.dataset.provider;
                    const provider = this.providers[pid];
                    c.style.background = '';
                    c.style.color = '';
                });
                
                card.classList.add('selected');
                const provider = this.providers[providerId];
                card.style.background = provider.color;
                card.style.color = 'white';

                if (onSelect) onSelect(providerId);
            });
            container.appendChild(card);
        });

        return container;
    }

    /**
     * Create provider comparison table
     */
    createProviderComparison() {
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.marginTop = '20px';
        table.style.borderCollapse = 'collapse';

        // Header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['Provider', 'Speed', 'Cost', 'Quota', 'Best For'].forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            th.style.padding = '12px';
            th.style.borderBottom = '2px solid var(--accent)';
            th.style.textAlign = 'left';
            th.style.fontWeight = '600';
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Body
        const tbody = document.createElement('tbody');
        Object.entries(this.providers).forEach(([id, provider]) => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid var(--border-color)';

            const cells = [
                `${provider.icon} ${provider.name}`,
                provider.speed,
                provider.cost,
                provider.quota,
                this.getBestFor(id)
            ];

            cells.forEach(cellContent => {
                const td = document.createElement('td');
                td.innerHTML = cellContent;
                td.style.padding = '12px';
                row.appendChild(td);
            });

            row.addEventListener('hover', function() {
                this.style.backgroundColor = 'var(--bg-primary)';
            });

            tbody.appendChild(row);
        });
        table.appendChild(tbody);

        return table;
    }

    /**
     * Get best use case for provider
     */
    getBestFor(providerId) {
        const bestFor = {
            'gemini': '🎓 Education',
            'openai': '💼 Professional',
            'anthropic': '🔒 Safety-focused',
            'nvidia': '⚡ Speed',
            'deepseek': '💰 Budget-friendly',
            'qwen': '🌍 Multilingual'
        };
        return bestFor[providerId] || 'General purpose';
    }

    /**
     * Create provider recommendation based on task
     */
    recommendProvider(taskType) {
        const recommendations = {
            'educational': 'gemini',
            'professional': 'openai',
            'fast': 'nvidia',
            'budget': 'deepseek',
            'safety': 'anthropic',
            'multilingual': 'qwen'
        };
        return recommendations[taskType] || 'gemini';
    }

    /**
     * Get provider info
     */
    getProviderInfo(providerId) {
        return this.providers[providerId] || null;
    }
}

// Global instance
window.providerSelector = new ProviderSelector();
