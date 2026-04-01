/**
 * ATLAS — Main Entry Point
 * Bootstraps all Atlas modules in the correct order.
 *
 * Load order in index.html must be:
 *   state.js → layout.js → renderer.js → input.js → atlas.js
 */

(function AtlasBootstrap() {
    function _boot() {
        const canvas = document.getElementById('atlas-canvas');
        if (!canvas) {
            console.error('[ATLAS] <canvas id="atlas-canvas"> not found.');
            return;
        }

        // 1. Init state — creates root placeholder
        AtlasState.init();

        // 2. Init renderer — sets up canvas context, DPR, resize listener
        AtlasRenderer.init(canvas);

        // 3. Compute initial layout (root node at centre)
        AtlasLayout.compute(canvas);

        // 4. First render
        AtlasRenderer.render();

        // 5. Wire up input handling
        AtlasInput.init(canvas, function onTreeSubmitted(output) {
            // Emit to the global event bus if present
            if (window.Bus && typeof window.Bus.emit === 'function') {
                window.Bus.emit('atlas:tree-submitted', output);
            }
        });

        console.log('%c[ATLAS] Ready.', 'color:#6c63ff;font-weight:bold');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _boot);
    } else {
        _boot();
    }
})();
