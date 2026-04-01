/**
 * ATLAS — Layout Engine  (v2 — Knuth in-order, no overlaps)
 *
 * Algorithm:
 *   1. Post-order: count how many leaf "slots" each subtree needs.
 *   2. In-order traversal: assign sequential x-indices to leaf nodes.
 *   3. Post-order: center every internal node over its children.
 *   4. Pre-order: convert indices → pixels, center the whole tree.
 *   5. Pre-order: assign depth-based y positions.
 *
 * Because leaves are sequential and parents sit at the midpoint of
 * their children, overlaps are structurally impossible.
 */

const AtlasLayout = (() => {

    // ── tunables ──────────────────────────────────────────────────────────────
    const BASE_NODE_RADIUS = 24;
    const MIN_SLOT_PX      = 62;   // minimum horizontal px per leaf slot
    const V_SPACING        = 85;   // vertical px between depth levels
    const TOP_PAD          = BASE_NODE_RADIUS + 24;

    // ── public: compute positions ─────────────────────────────────────────────
    function compute(canvas) {
        const rootId = AtlasState.getRootId();
        if (!rootId) return;

        // Logical canvas dimensions (CSS pixels, not physical)
        const W = canvas.getBoundingClientRect().width  || canvas.clientWidth  || 800;

        const allNodes = AtlasState.getAllNodes();

        // Fast id → node lookup
        const map = {};
        allNodes.forEach(n => { map[n.id] = n; });

        // ── 1. Count leaf slots per subtree (post-order) ─────────────────────
        function slotCount(id) {
            const n = map[id];
            if (!n) return 0;
            if (!n.left && !n.right) return 1;          // leaf
            return slotCount(n.left) + slotCount(n.right);
        }

        const totalLeaves = Math.max(1, slotCount(rootId));
        const slotW = Math.max(MIN_SLOT_PX, W / totalLeaves);

        // ── 2. In-order: assign sequential slot indices to leaves ─────────────
        const slotIndex = {};      // id → leaf index (only leaves)
        let _leafCursor = 0;

        function assignSlots(id) {
            const n = map[id];
            if (!n) return;
            if (!n.left && !n.right) {
                slotIndex[id] = _leafCursor++;
                return;
            }
            if (n.left)  assignSlots(n.left);
            if (n.right) assignSlots(n.right);
        }
        assignSlots(rootId);

        // ── 3. Post-order: compute raw x for every node ───────────────────────
        // Leaves: slotIndex * slotW
        // Internals: midpoint of children
        const rawX = {};

        function computeRawX(id) {
            const n = map[id];
            if (!n) return 0;
            if (!n.left && !n.right) {
                rawX[id] = slotIndex[id] * slotW;
                return rawX[id];
            }
            const lx = n.left  ? computeRawX(n.left)  : null;
            const rx = n.right ? computeRawX(n.right) : null;

            if (lx !== null && rx !== null) rawX[id] = (lx + rx) / 2;
            else if (lx !== null)           rawX[id] = lx;
            else                            rawX[id] = rx;

            return rawX[id];
        }
        computeRawX(rootId);

        // ── 4. Center the root in the canvas, shift everything ────────────────
        const offset = W / 2 - rawX[rootId];

        // ── 5. Pre-order: write final (x, y) back into state nodes ───────────
        function applyPositions(id, depth) {
            const n = map[id];
            if (!n) return;
            n.x = (rawX[id] ?? 0) + offset;
            n.y = TOP_PAD + depth * V_SPACING;
            if (n.left)  applyPositions(n.left,  depth + 1);
            if (n.right) applyPositions(n.right, depth + 1);
        }
        applyPositions(rootId, 0);
    }

    function getNodeRadius() { return BASE_NODE_RADIUS; }

    return { compute, getNodeRadius };
})();
