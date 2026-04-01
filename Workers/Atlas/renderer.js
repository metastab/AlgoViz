/**
 * ATLAS — Renderer
 * Draws the binary tree onto the canvas using CanvasRenderingContext2D.
 * Reads positions from AtlasState and uses AtlasLayout for the radius constant.
 *
 * Colour palette:
 *   Inactive (dimmed) node  — dark background, muted stroke, low opacity label
 *   Active node             — accent gradient fill, crisp white text
 *   Edge                    — subtle glowing line
 *   Frozen overlay          — whole canvas gets a subtle vignette
 */

const AtlasRenderer = (() => {

    // ── design tokens ────────────────────────────────────────────────────────
    const C = {
        bg:             '#0d0f1a',
        gridLine:       'rgba(255,255,255,0.03)',

        nodeActive:     ['#6c63ff', '#a78bfa'],   // gradient stops
        nodeDimmed:     '#1e2140',
        nodeStrokeActive: '#a78bfa',
        nodeStrokeDimmed: '#2e3260',
        nodeStrokeHover:  '#f0abfc',

        labelActive:    '#ffffff',
        labelDimmed:    'rgba(120,130,180,0.45)',
        labelPlus:      'rgba(140,150,200,0.6)',

        edge:           'rgba(167,139,250,0.5)',
        edgeGlow:       'rgba(167,139,250,0.15)',

        frozen:         'rgba(10,10,26,0.35)',

        submitBg:       'linear-gradient(135deg,#6c63ff,#a78bfa)',
    };

    const R = AtlasLayout.getNodeRadius;   // function ref — call to get value

    // ── state ─────────────────────────────────────────────────────────────────
    let _canvas  = null;
    let _ctx     = null;
    let _hoverId = null;   // node id currently under the mouse
    let _dpr     = 1;

    // Camera / pan offset (in logical CSS pixels)
    let _camX = 0;
    let _camY = 0;

    // ── init ─────────────────────────────────────────────────────────────────
    function init(canvas) {
        _canvas = canvas;
        _ctx    = canvas.getContext('2d');
        _dpr    = window.devicePixelRatio || 1;
        _resize();
        window.addEventListener('resize', _resize);
    }

    function _resize() {
        const rect = _canvas.getBoundingClientRect();
        _canvas.width  = rect.width  * _dpr;
        _canvas.height = rect.height * _dpr;
        _ctx.scale(_dpr, _dpr);
        AtlasLayout.compute(_canvas);
        render();
    }

    // expose so Input can update hovered node without importing renderer state
    function setHoveredNode(id) { _hoverId = id; }

    // ── camera API (used by Input for panning) ────────────────────────────────
    function setCamera(x, y) { _camX = x; _camY = y; }
    function getCamera()     { return { x: _camX, y: _camY }; }

    // ── main render ───────────────────────────────────────────────────────────
    function render() {
        if (!_ctx) return;
        const w = _canvas.width  / _dpr;
        const h = _canvas.height / _dpr;

        _ctx.clearRect(0, 0, w, h);
        _drawBackground(w, h);

        // ── apply camera transform for everything in world space ──────────────
        _ctx.save();
        _ctx.translate(_camX, _camY);

        const nodes = AtlasState.getAllNodes();

        // draw edges first (below nodes)
        nodes.forEach(node => {
            if (!node.isActive) return;
            _drawEdge(node, 'left');
            _drawEdge(node, 'right');
        });

        // draw nodes
        nodes.forEach(node => _drawNode(node));

        _ctx.restore();  // end camera transform

        // frozen overlay drawn in screen space (no camera)
        if (AtlasState.isFrozen()) _drawFrozenOverlay(w, h);
    }

    // ── background ───────────────────────────────────────────────────────────
    function _drawBackground(w, h) {
        _ctx.fillStyle = C.bg;
        _ctx.fillRect(0, 0, w, h);
    }

    // ── edges ────────────────────────────────────────────────────────────────
    function _drawEdge(parentNode, side) {
        const childId = parentNode[side];
        if (!childId) return;
        const child = AtlasState.getNode(childId);
        if (!child) return;

        const px = parentNode.x, py = parentNode.y;
        const cx = child.x,      cy = child.y;

        // glow pass
        _ctx.save();
        _ctx.beginPath();
        _ctx.moveTo(px, py);
        _ctx.lineTo(cx, cy);
        _ctx.strokeStyle = C.edgeGlow;
        _ctx.lineWidth   = 8;
        _ctx.lineCap     = 'round';
        _ctx.stroke();

        // crisp line
        _ctx.beginPath();
        _ctx.moveTo(px, py);
        _ctx.lineTo(cx, cy);
        _ctx.strokeStyle = C.edge;
        _ctx.lineWidth   = 1.5;
        _ctx.stroke();
        _ctx.restore();
    }

    // ── nodes ────────────────────────────────────────────────────────────────
    function _drawNode(node) {
        const r        = R();
        const isHovered = node.id === _hoverId && !AtlasState.isFrozen();
        const { x, y } = node;

        _ctx.save();

        if (node.isActive) {
            // glow ring
            _ctx.shadowColor = C.nodeStrokeActive;
            _ctx.shadowBlur  = isHovered ? 24 : 14;

            // gradient fill
            const grad = _ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
            grad.addColorStop(0, C.nodeActive[0]);
            grad.addColorStop(1, C.nodeActive[1]);
            _ctx.fillStyle = grad;

            _ctx.beginPath();
            _ctx.arc(x, y, r, 0, Math.PI * 2);
            _ctx.fill();

            // stroke
            _ctx.strokeStyle = isHovered ? C.nodeStrokeHover : C.nodeStrokeActive;
            _ctx.lineWidth   = 2;
            _ctx.stroke();

            // value label
            _ctx.shadowBlur  = 0;
            _ctx.fillStyle   = C.labelActive;
            _ctx.font        = `bold ${Math.round(r * 0.7)}px 'Inter', sans-serif`;
            _ctx.textAlign   = 'center';
            _ctx.textBaseline = 'middle';
            _ctx.fillText(String(node.value), x, y);

        } else {
            // dimmed / inactive
            _ctx.shadowColor = isHovered ? C.nodeStrokeHover : 'transparent';
            _ctx.shadowBlur  = isHovered ? 16 : 0;

            _ctx.fillStyle = C.nodeDimmed;
            _ctx.beginPath();
            _ctx.arc(x, y, r, 0, Math.PI * 2);
            _ctx.fill();

            _ctx.strokeStyle = isHovered ? C.nodeStrokeHover : C.nodeStrokeDimmed;
            _ctx.lineWidth   = 1.5;
            _ctx.setLineDash([4, 4]);
            _ctx.stroke();
            _ctx.setLineDash([]);

            // "+" hint
            _ctx.shadowBlur   = 0;
            _ctx.fillStyle    = isHovered
                ? 'rgba(240,171,252,0.85)'
                : C.labelPlus;
            _ctx.font         = `${Math.round(r * 0.8)}px 'Inter', sans-serif`;
            _ctx.textAlign    = 'center';
            _ctx.textBaseline = 'middle';
            _ctx.fillText('+', x, y);
        }

        _ctx.restore();
    }

    // ── frozen vignette ──────────────────────────────────────────────────────
    function _drawFrozenOverlay(w, h) {
        const grad = _ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.85);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(1, C.frozen);
        _ctx.fillStyle = grad;
        _ctx.fillRect(0, 0, w, h);
    }

    // ── coordinate helpers (used by Input) ───────────────────────────────────
    /** Convert a mouse-event position to canvas logical coordinates. */
    function eventToCanvas(e) {
        const rect = _canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left),
            y: (e.clientY - rect.top),
        };
    }

    /** Find which node (if any) is at canvas point {x,y}.
     *  cx/cy are in screen (CSS) pixels; convert to world space first.
     */
    function hitTest(cx, cy) {
        const r = R();
        // Transform screen point → world point by subtracting camera offset
        const wx = cx - _camX;
        const wy = cy - _camY;
        const nodes = AtlasState.getAllNodes();
        for (let i = nodes.length - 1; i >= 0; i--) {
            const n = nodes[i];
            const dx = n.x - wx;
            const dy = n.y - wy;
            if (dx * dx + dy * dy <= r * r) return n;
        }
        return null;
    }

    return { init, render, setHoveredNode, setCamera, getCamera, eventToCanvas, hitTest };
})();
