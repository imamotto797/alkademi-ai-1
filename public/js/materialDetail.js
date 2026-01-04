(function () {
    // Material Detail page script
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    const titleEl = document.getElementById('materialTitle');
    const subtitleEl = document.getElementById('materialSubtitle');
    const contentPre = document.getElementById('materialContentPre');
    const metaEl = document.getElementById('materialMeta');
    const analyticsEl = document.getElementById('detailAnalytics');

    const backBtn = document.getElementById('backBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const refineBtn = document.getElementById('refineBtn');
    const submitFeedbackBtn = document.getElementById('submitDetailFeedback');

    const ratingEl = document.getElementById('detailRating');
    const feedbackEl = document.getElementById('detailFeedback');

    if (!id) {
        utils.Notification.error('No material specified');
        setTimeout(() => location.href = '/html/materials.html', 800);
        throw new Error('Missing material id');
    }

    const loadMaterial = async () => {
        try {
            const res = await api.getMaterial(id);
            const material = res.material || res.data || res;

            titleEl.textContent = material.title || 'Untitled Material';
            subtitleEl.textContent = material.source_type === 'generated' ? 'Generated Material' : 'Source Material';

            contentPre.textContent = material.content || '';

            metaEl.innerHTML = `
                <div><strong>ID:</strong> ${material.id}</div>
                <div><strong>Created:</strong> ${utils.DateFormatter.format(material.created_at, 'long')}</div>
                ${material.updated_at ? `<div><strong>Updated:</strong> ${utils.DateFormatter.format(material.updated_at, 'long')}</div>` : ''}
                <div style="margin-top:8px; color: #666;">Source: ${material.source || 'upload'}</div>
            `;

            // Log access for analytics
            api.logMaterialAccess(material.id).catch(console.error);

            // Load analytics for the material (if available)
            try {
                const analytics = await api.getMaterialAnalytics(material.id);
                analyticsEl.innerHTML = `
                    <div>Views: ${analytics.views || 0}</div>
                    <div>Downloads: ${analytics.downloads || 0}</div>
                    <div>Avg. Read Time: ${analytics.avg_read_time || 'N/A'}</div>
                `;
            } catch (e) {
                analyticsEl.innerHTML = '<div>N/A</div>';
            }

            // Wire up buttons
            backBtn.addEventListener('click', () => window.location.href = '/html/materials.html');

            downloadBtn.addEventListener('click', () => {
                // Trigger CSV/text download
                const blob = new Blob([material.content || ''], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${(material.title || 'material').replace(/[^a-z0-9\-_.]/gi, '_')}.txt`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                api.logMaterialDownload(material.id, 'txt').catch(console.error);
            });

            deleteBtn.addEventListener('click', async () => {
                if (!confirm(`Delete "${material.title}"? This action cannot be undone.`)) return;
                try {
                    await api.deleteMaterial(material.id);
                    utils.Notification.success('Material deleted');
                    setTimeout(() => window.location.href = '/html/materials.html', 600);
                } catch (err) {
                    utils.Notification.error('Failed to delete material');
                }
            });

            refineBtn.addEventListener('click', async () => {
                // Optionally open a small prompt to get refinement instructions
                const prompt = prompt('Enter refinement instructions (e.g., "more examples", "simplify language")');
                if (!prompt) return;
                try {
                    await api.refineMaterials(material.id, prompt);
                    utils.Notification.success('Refinement requested; regenerating material');
                    setTimeout(() => location.reload(), 1000);
                } catch (err) {
                    utils.Notification.error('Failed to request refinement');
                }
            });

            submitFeedbackBtn.addEventListener('click', async () => {
                const rating = parseInt(ratingEl.value, 10);
                const feedback = feedbackEl.value.trim();
                if (!feedback) {
                    utils.Notification.warning('Please enter feedback before submitting');
                    return;
                }
                try {
                    await api.addMaterialFeedback(material.id, rating, feedback);
                    utils.Notification.success('Thank you for your feedback');
                    feedbackEl.value = '';
                } catch (err) {
                    utils.Notification.error('Failed to submit feedback');
                }
            });

        } catch (error) {
            console.error('Failed to load material:', error);
            utils.Notification.error('Failed to load material');
            setTimeout(() => history.back(), 800);
        }
    };

    // Initialize
    document.addEventListener('DOMContentLoaded', () => loadMaterial());
})();