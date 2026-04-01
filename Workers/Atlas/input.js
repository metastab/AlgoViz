/**
 * ATLAS — Input Handler
 * Manages all user interaction:
 *   • Mouse move → hover effect
 *   • Click on dimmed node → open value prompt overlay
 *   • Overlay submit → activate node, expand tree
 *   • Submit Tree button → freeze & serialize
 */

const AtlasInput = (() => {

    let _canvas  = null;
    let _overlay = null;   // the floating input DOM element
    let _pendingNodeId = null;
    let _onSubmit = null;  // callback(serialized)

    // ── panning state ──────────────────────────────────────────────────────────
    let _isPanning   = false;
    let _panOriginX  = 0;   // mouse X when pan started (px)
    let _panOriginY  = 0;
    let _camOriginX  = 0;   // camera offset when pan started
    let _camOriginY  = 0;

    // ── init ─────────────────────────────────────────────────────────────────
    function init(canvas, onSubmitCallback) {
        _canvas   = canvas;
        _onSubmit = onSubmitCallback;

        _buildOverlay();

        canvas.addEventListener('mousemove',    _onMouseMove);
        canvas.addEventListener('mousedown',    _onMouseDown);
        canvas.addEventListener('mouseup',      _onMouseUp);
        canvas.addEventListener('click',        _onClick);
        canvas.addEventListener('mouseleave',   _onMouseLeave);
        canvas.addEventListener('contextmenu',  e => e.preventDefault());  // suppress browser menu

        document.getElementById('atlas-submit-btn')
            ?.addEventListener('click', _onSubmitTree);
    }

    // ── overlay DOM ─────────────────────────────────────────────────────────
    function _buildOverlay() {
        _overlay = document.createElement('div');
        _overlay.id = 'atlas-input-overlay';
        _overlay.innerHTML = `
            <div class="atlas-overlay-card" id="atlas-overlay-card">
                <p class="atlas-overlay-label">Enter node value</p>
                <input
                    id="atlas-node-input"
                    type="number"
                    placeholder="e.g. 42"
                    autocomplete="off"
                />
                <div class="atlas-overlay-actions">
                    <button id="atlas-overlay-confirm">Add Node</button>
                    <button id="atlas-overlay-cancel" class="secondary">Cancel</button>
                </div>
            </div>
        `;
        _overlay.style.display = 'none';
        document.body.appendChild(_overlay);

        document.getElementById('atlas-overlay-confirm')
            .addEventListener('click', _confirmInput);
        document.getElementById('atlas-overlay-cancel')
            .addEventListener('click', _closeOverlay);

        // keyboard shortcuts
        document.getElementById('atlas-node-input')
            .addEventListener('keydown', e => {
                if (e.key === 'Enter')  _confirmInput();
                if (e.key === 'Escape') _closeOverlay();
            });
    }

    // ── pan handlers ─────────────────────────────────────────────────────────
    function _onMouseDown(e) {
        if (e.button !== 2) return;           // right-click only
        e.preventDefault();
        _isPanning = true;
        const cam = AtlasRenderer.getCamera();
        _panOriginX = e.clientX;
        _panOriginY = e.clientY;
        _camOriginX = cam.x;
        _camOriginY = cam.y;
        _canvas.style.cursor = 'grabbing';
    }

    function _onMouseUp(e) {
        if (e.button !== 2) return;
        _isPanning = false;
        _canvas.style.cursor = 'default';
        AtlasRenderer.render();
    }

    // ── mouse events ─────────────────────────────────────────────────────────
    function _onMouseMove(e) {
        if (_isPanning) {
            // Shift camera by mouse delta
            const dx = e.clientX - _panOriginX;
            const dy = e.clientY - _panOriginY;
            AtlasRenderer.setCamera(_camOriginX + dx, _camOriginY + dy);
            AtlasRenderer.render();
            return;   // don't update hover while panning
        }

        if (AtlasState.isFrozen()) return;
        const pt   = AtlasRenderer.eventToCanvas(e);
        const node = AtlasRenderer.hitTest(pt.x, pt.y);
        AtlasRenderer.setHoveredNode(node ? node.id : null);
        _canvas.style.cursor = node ? 'pointer' : 'default';
        AtlasRenderer.render();
    }

    function _onMouseLeave() {
        if (_isPanning) {
            // Treat leaving canvas as releasing the pan
            _isPanning = false;
        }
        AtlasRenderer.setHoveredNode(null);
        _canvas.style.cursor = 'default';
        AtlasRenderer.render();
    }

    function _onClick(e) {
        if (_isPanning) return;            // ignore accidental clicks during pan
        if (e.button !== 0) return;        // left-click only
        if (AtlasState.isFrozen()) return;
        const pt   = AtlasRenderer.eventToCanvas(e);
        const node = AtlasRenderer.hitTest(pt.x, pt.y);
        if (!node || node.isActive) return;

        _pendingNodeId = node.id;
        _openOverlay(e.clientX, e.clientY);
    }

    // ── overlay open/close ───────────────────────────────────────────────────
    function _openOverlay(clientX, clientY) {
        const input  = document.getElementById('atlas-node-input');
        input.value  = '';

        // position near the click, stay in viewport
        const OW = 220, OH = 130;
        let left = clientX + 12;
        let top  = clientY + 12;
        if (left + OW > window.innerWidth)  left = clientX - OW - 12;
        if (top  + OH > window.innerHeight) top  = clientY - OH - 12;

        _overlay.style.left    = `${left}px`;
        _overlay.style.top     = `${top}px`;
        _overlay.style.display = 'block';

        // animate in
        const card = document.getElementById('atlas-overlay-card');
        card.style.animation = 'none';
        requestAnimationFrame(() => {
            card.style.animation = 'atlasCardIn 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards';
        });

        setTimeout(() => input.focus(), 50);
    }

    function _closeOverlay() {
        _overlay.style.display = 'none';
        _pendingNodeId = null;
    }

    // ── confirm value ─────────────────────────────────────────────────────────
    function _confirmInput() {
        const input = document.getElementById('atlas-node-input');
        const raw   = input.value.trim();
        if (raw === '') { input.classList.add('shake'); setTimeout(() => input.classList.remove('shake'), 400); return; }

        const value = Number(raw);
        if (isNaN(value)) { input.classList.add('shake'); setTimeout(() => input.classList.remove('shake'), 400); return; }

        // ⚠️ Save before _closeOverlay() nulls it out
        const nodeId = _pendingNodeId;
        _closeOverlay();

        AtlasState.activateNode(nodeId, value);
        AtlasLayout.compute(_canvas);
        AtlasRenderer.render();
    }

    // ── submit tree ──────────────────────────────────────────────────────────
    function _onSubmitTree() {
        const serialized = AtlasState.serialize();

        // ── Resolve selected algorithm ────────────────────────────────────────
        const algoSelect = document.getElementById('atlas-algo-select');
        const algoValue  = algoSelect ? algoSelect.value : 'bfs';
        const algoLabels = {
            'bfs':          'BFS — Level Order',
            'dfs-inorder':  'DFS — In-order',
            'dfs-preorder': 'DFS — Pre-order',
            'dfs-postorder':'DFS — Post-order',
        };

        const traversalOrder = [];
        if (algoValue === 'bfs') {
            serialized.traversalHelpers.bfs(n => traversalOrder.push(n.value));
        } else {
            const dfsVariant = algoValue.replace('dfs-', '');  // 'inorder' | 'preorder' | 'postorder'
            serialized.traversalHelpers.dfs(n => traversalOrder.push(n.value), dfsVariant);
        }

        // Attach to output
        serialized.selectedAlgorithm = {
            id:     algoValue,
            label:  algoLabels[algoValue] ?? algoValue,
            result: traversalOrder,
        };

        // visual freeze feedback
        AtlasRenderer.render();

        // fire user callback
        if (typeof _onSubmit === 'function') _onSubmit(serialized);

        // ── Console output ────────────────────────────────────────────────────
        console.group('%c[ATLAS] Tree Submitted', 'color:#a78bfa;font-weight:bold');
        console.log('Algorithm:', serialized.selectedAlgorithm.label);
        console.log('Traversal order:', traversalOrder);
        console.log('Root:',  serialized.root);
        console.log('Nodes:', serialized.nodes);
        console.log('Edges:', serialized.edges);
        console.groupEnd();

        // expose on window for external algorithm workers
        window.AtlasTreeOutput = serialized;

        // ── Update controls state ─────────────────────────────────────────────
        const btn = document.getElementById('atlas-submit-btn');
        if (btn) {
            btn.textContent = `✓ ${algoLabels[algoValue]?.split('—')[0].trim() ?? 'Done'}`;
            btn.disabled    = true;
            btn.classList.add('submitted');
        }
        if (algoSelect) algoSelect.disabled = true;
    }

    return { init };
})();

