/**
 * ATLAS — State Manager
 * Owns the tree data model. All mutations go through here.
 */

const AtlasState = (() => {
    // ── internal store ──────────────────────────────────────────────────────
    let _nodes = {};          // id → node object
    let _root  = null;        // id of root node
    let _nextId = 0;
    let _frozen = false;      // true after Submit

    // ── helpers ─────────────────────────────────────────────────────────────
    function _makeId() { return `n${_nextId++}`; }

    function _createNode({ parentId = null, side = null, depth = 0 } = {}) {
        const id = _makeId();
        const node = {
            id,
            value:    null,     // numeric value, null until activated
            left:     null,     // child node id
            right:    null,     // child node id
            parentId,
            side,               // 'left' | 'right' | null (root)
            depth,
            isActive: false,
            // positions computed by layout engine
            x: 0,
            y: 0,
        };
        _nodes[id] = node;
        return node;
    }

    // ── public API ───────────────────────────────────────────────────────────

    /** Initialise the tree — creates the dimmed root placeholder. */
    function init() {
        _nodes  = {};
        _root   = null;
        _nextId = 0;
        _frozen = false;
        const root = _createNode({ depth: 0 });
        _root = root.id;
        return root;
    }

    /**
     * Activate a dimmed node: set value, mark active, generate children.
     * Returns the two new child placeholder nodes.
     */
    function activateNode(id, value) {
        if (_frozen) return null;
        const node = _nodes[id];
        if (!node || node.isActive) return null;

        node.isActive = true;
        node.value    = value;

        // spawn left child
        const leftChild  = _createNode({ parentId: id, side: 'left',  depth: node.depth + 1 });
        const rightChild = _createNode({ parentId: id, side: 'right', depth: node.depth + 1 });

        node.left  = leftChild.id;
        node.right = rightChild.id;

        return { left: leftChild, right: rightChild };
    }

    function getNode(id)    { return _nodes[id] ?? null; }
    function getAllNodes()   { return Object.values(_nodes); }
    function getRootId()    { return _root; }
    function isFrozen()     { return _frozen; }

    /**
     * Freeze the tree and return the full serialized output object.
     */
    function serialize() {
        _frozen = true;

        const activeNodes = getAllNodes().filter(n => n.isActive);
        const edgeList = [];

        activeNodes.forEach(node => {
            if (node.left  && _nodes[node.left]?.isActive)  edgeList.push({ from: node.id, to: node.left,  side: 'left'  });
            if (node.right && _nodes[node.right]?.isActive) edgeList.push({ from: node.id, to: node.right, side: 'right' });
        });

        // ── traversal helpers ────────────────────────────────────────────────
        function bfs(callback) {
            if (!_root || !_nodes[_root]?.isActive) return;
            const queue = [_nodes[_root]];
            while (queue.length) {
                const current = queue.shift();
                callback(current);
                if (current.left  && _nodes[current.left]?.isActive)  queue.push(_nodes[current.left]);
                if (current.right && _nodes[current.right]?.isActive) queue.push(_nodes[current.right]);
            }
        }

        function dfs(callback, order = 'inorder') {
            function _traverse(nodeId) {
                if (!nodeId || !_nodes[nodeId]?.isActive) return;
                const node = _nodes[nodeId];
                if (order === 'preorder')  callback(node);
                _traverse(node.left);
                if (order === 'inorder')   callback(node);
                _traverse(node.right);
                if (order === 'postorder') callback(node);
            }
            _traverse(_root);
        }

        return {
            root: _nodes[_root]?.isActive ? { ..._nodes[_root] } : null,
            nodes: activeNodes.map(n => ({ ...n })),
            edges: edgeList,
            traversalHelpers: { bfs, dfs },
        };
    }

    return { init, activateNode, getNode, getAllNodes, getRootId, isFrozen, serialize };
})();
