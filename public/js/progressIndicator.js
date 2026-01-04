/**
 * ProgressIndicator - Step-based progress tracking component
 */

class ProgressIndicator {
    constructor(containerId, steps = ['Upload', 'Analyze', 'Generate', 'View']) {
        this.container = document.getElementById(containerId);
        this.steps = steps;
        this.currentStep = 0;
        this.completedSteps = new Set();
        
        if (this.container) {
            this.render();
        }
    }

    /**
     * Render progress indicator
     */
    render() {
        this.container.innerHTML = '';
        
        const stepsContainer = document.createElement('div');
        stepsContainer.className = 'progress-steps';

        this.steps.forEach((step, index) => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'progress-step';
            
            if (index === this.currentStep) {
                stepDiv.classList.add('active');
            } else if (index < this.currentStep || this.completedSteps.has(index)) {
                stepDiv.classList.add('completed');
            }

            stepDiv.innerHTML = `
                <div class="progress-step-number">
                    ${this.completedSteps.has(index) ? '✓' : index + 1}
                </div>
                <div class="progress-step-label">${step}</div>
                ${index < this.steps.length - 1 ? '<div class="progress-connector"></div>' : ''}
            `;

            stepsContainer.appendChild(stepDiv);
        });

        this.container.appendChild(stepsContainer);
    }

    /**
     * Move to next step
     */
    nextStep() {
        this.completedSteps.add(this.currentStep);
        this.currentStep++;
        if (this.currentStep >= this.steps.length) {
            this.currentStep = this.steps.length - 1;
        }
        this.render();
    }

    /**
     * Go to specific step
     */
    goToStep(stepIndex) {
        this.currentStep = Math.min(stepIndex, this.steps.length - 1);
        this.render();
    }

    /**
     * Mark step as completed
     */
    markStepComplete(stepIndex) {
        this.completedSteps.add(stepIndex);
        this.render();
    }

    /**
     * Reset progress
     */
    reset() {
        this.currentStep = 0;
        this.completedSteps.clear();
        this.render();
    }

    /**
     * Get current step
     */
    getCurrentStep() {
        return this.steps[this.currentStep];
    }
}

// Export for use
window.ProgressIndicator = ProgressIndicator;
