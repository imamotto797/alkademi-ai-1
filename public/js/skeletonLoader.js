/**
 * Skeleton Loader - Reusable skeleton loader components
 */
class SkeletonLoader {
    /**
     * Create a skeleton text element
     */
    static createTextSkeleton(width = '100%', height = '16px') {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton skeleton-text';
        skeleton.style.width = width;
        skeleton.style.height = height;
        return skeleton;
    }

    /**
     * Create a skeleton title element
     */
    static createTitleSkeleton(width = '40%') {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton skeleton-title';
        skeleton.style.width = width;
        return skeleton;
    }

    /**
     * Create a skeleton card with multiple elements
     */
    static createCardSkeleton(lines = 3) {
        const card = document.createElement('div');
        card.className = 'skeleton-card skeleton';
        
        // Add title
        const title = this.createTitleSkeleton('50%');
        card.appendChild(title);

        // Add text lines
        for (let i = 0; i < lines; i++) {
            const width = i === lines - 1 ? '80%' : '100%';
            const text = this.createTextSkeleton(width);
            card.appendChild(text);
        }

        return card;
    }

    /**
     * Create a skeleton for material list
     */
    static createMaterialListSkeleton(count = 5) {
        const container = document.createElement('div');
        for (let i = 0; i < count; i++) {
            container.appendChild(this.createCardSkeleton(2));
        }
        return container;
    }

    /**
     * Create a skeleton for generation output
     */
    static createGenerationSkeleton() {
        const container = document.createElement('div');
        
        // Header
        const header = document.createElement('div');
        header.style.marginBottom = '20px';
        header.appendChild(this.createTitleSkeleton('60%'));
        header.appendChild(this.createTextSkeleton('80%', '12px'));
        container.appendChild(header);

        // Content sections
        for (let section = 0; section < 3; section++) {
            const sectionDiv = document.createElement('div');
            sectionDiv.style.marginBottom = '20px';
            sectionDiv.appendChild(this.createTitleSkeleton('45%'));
            
            for (let line = 0; line < 4; line++) {
                sectionDiv.appendChild(this.createTextSkeleton());
            }
            container.appendChild(sectionDiv);
        }

        return container;
    }

    /**
     * Create a skeleton for analytics dashboard
     */
    static createAnalyticsSkeleton() {
        const container = document.createElement('div');
        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(300px, 1fr))';
        container.style.gap = '20px';

        for (let i = 0; i < 4; i++) {
            const card = this.createCardSkeleton(3);
            card.style.minHeight = '150px';
            container.appendChild(card);
        }

        return container;
    }

    /**
     * Create a loading spinner
     */
    static createSpinner(message = 'Loading...') {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.padding = '40px 20px';
        container.style.gap = '15px';

        const spinner = document.createElement('div');
        spinner.className = 'spinner';

        const text = document.createElement('p');
        text.textContent = message;
        text.style.margin = '0';
        text.style.color = 'var(--text-secondary)';

        container.appendChild(spinner);
        container.appendChild(text);

        return container;
    }

    /**
     * Show loading state in an element
     */
    static showLoading(element, message = 'Loading...') {
        if (!element) return;
        element.innerHTML = '';
        element.appendChild(this.createSpinner(message));
    }

    /**
     * Show skeleton loading state
     */
    static showSkeletonLoading(element, type = 'card', count = 1) {
        if (!element) return;
        element.innerHTML = '';

        let skeleton;
        switch (type) {
            case 'card':
                skeleton = this.createCardSkeleton();
                break;
            case 'list':
                skeleton = this.createMaterialListSkeleton(count);
                break;
            case 'generation':
                skeleton = this.createGenerationSkeleton();
                break;
            case 'analytics':
                skeleton = this.createAnalyticsSkeleton();
                break;
            default:
                skeleton = this.createCardSkeleton();
        }

        element.appendChild(skeleton);
    }

    /**
     * Create a progress bar
     */
    static createProgressBar(percentage = 0, animated = true) {
        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '8px';
        container.style.backgroundColor = 'var(--bg-primary)';
        container.style.borderRadius = '4px';
        container.style.overflow = 'hidden';
        container.style.marginBottom = '10px';

        const bar = document.createElement('div');
        bar.style.height = '100%';
        bar.style.backgroundColor = 'var(--accent)';
        bar.style.width = percentage + '%';
        bar.style.transition = animated ? 'width 0.3s ease' : 'none';

        container.appendChild(bar);
        return { container, bar };
    }

    /**
     * Create an upload progress indicator
     */
    static createUploadProgress(filename = 'File') {
        const container = document.createElement('div');
        container.style.padding = '15px';
        container.style.backgroundColor = 'var(--bg-primary)';
        container.style.borderRadius = '8px';
        container.style.marginBottom = '10px';

        const nameDiv = document.createElement('div');
        nameDiv.style.marginBottom = '8px';
        nameDiv.style.fontWeight = '500';
        nameDiv.textContent = filename;

        const { container: progressBar, bar } = this.createProgressBar(0);

        const percentDiv = document.createElement('div');
        percentDiv.style.fontSize = '12px';
        percentDiv.style.marginTop = '5px';
        percentDiv.style.color = 'var(--text-secondary)';
        percentDiv.textContent = '0%';

        container.appendChild(nameDiv);
        container.appendChild(progressBar);
        container.appendChild(percentDiv);

        return {
            container,
            update: (percentage) => {
                bar.style.width = percentage + '%';
                percentDiv.textContent = Math.round(percentage) + '%';
            }
        };
    }
}

// Export for use
window.SkeletonLoader = SkeletonLoader;
