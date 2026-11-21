(function (globalScope) {
    "use strict";

    function hashString(value) {
        let hash = 2166136261;
        for (let index = 0; index < value.length; index += 1) {
            hash ^= value.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }

    function clamp(value, minimum, maximum) {
        return Math.min(maximum, Math.max(minimum, value));
    }

    function distanceToSegment(point, start, end) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
        const ratio = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy), 0, 1);
        return Math.hypot(point.x - (start.x + ratio * dx), point.y - (start.y + ratio * dy));
    }

    class NaturalPhilosophyNetworkRenderer {
        constructor(canvas) {
            if (!canvas || typeof canvas.getContext !== "function") throw new Error("Network canvas is unavailable.");
            this.canvas = canvas;
            this.context = canvas.getContext("2d");
            this.graph = null;
            this.positions = new Map();
            this.metric = "betweenness";
            this.selectedNodeId = null;
            this.selectedEdgeKey = null;
            this.hoveredNodeId = null;
            this.zoom = 0.82;
            this.pan = { x: 0, y: 0 };
            this.pointerState = null;
            this.cssWidth = 1200;
            this.cssHeight = 720;
            this.syncSize();
        }

        syncSize() {
            const rect = this.canvas.getBoundingClientRect();
            this.cssWidth = Math.max(320, Math.round(rect.width || this.canvas.width || 1200));
            this.cssHeight = Math.max(420, Math.round(rect.height || this.canvas.height || 720));
            const density = Math.min(2, globalScope.devicePixelRatio || 1);
            const width = Math.round(this.cssWidth * density);
            const height = Math.round(this.cssHeight * density);
            if (this.canvas.width !== width || this.canvas.height !== height) {
                this.canvas.width = width;
                this.canvas.height = height;
            }
            this.context.setTransform(density, 0, 0, density, 0, 0);
            this.draw();
        }

        seedPosition(personId, index, count) {
            const hash = hashString(personId);
            const angle = index / Math.max(1, count) * Math.PI * 2 + (hash % 1000) / 1000;
            const radius = 150 + hash % 270;
            return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * 0.7, vx: 0, vy: 0 };
        }

        setGraph(graph, metric = this.metric) {
            this.graph = graph;
            this.metric = metric;
            const activeIds = new Set(graph.nodes.map((node) => node.id));
            [...this.positions.keys()].forEach((id) => {
                if (!activeIds.has(id)) this.positions.delete(id);
            });
            graph.nodes.forEach((node, index) => {
                if (!this.positions.has(node.id)) this.positions.set(node.id, this.seedPosition(node.id, index, graph.nodes.length));
            });
            this.runLayout(72);
            this.draw();
        }

        runLayout(iterations = 60) {
            if (!this.graph || this.graph.nodes.length === 0) return;
            const nodes = this.graph.nodes;
            const edges = this.graph.displayedEdges;
            const idealDistance = nodes.length > 100 ? 78 : 105;
            for (let iteration = 0; iteration < iterations; iteration += 1) {
                const cooling = 1 - iteration / iterations;
                nodes.forEach((node) => {
                    const position = this.positions.get(node.id);
                    position.vx *= 0.72;
                    position.vy *= 0.72;
                    position.vx -= position.x * 0.0008;
                    position.vy -= position.y * 0.0008;
                });

                for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
                    const left = this.positions.get(nodes[leftIndex].id);
                    for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
                        const right = this.positions.get(nodes[rightIndex].id);
                        let dx = right.x - left.x;
                        let dy = right.y - left.y;
                        const squared = Math.max(36, dx * dx + dy * dy);
                        const distance = Math.sqrt(squared);
                        if (distance === 0) {
                            dx = 1;
                            dy = 0;
                        }
                        const force = 780 / squared;
                        const fx = dx / distance * force;
                        const fy = dy / distance * force;
                        left.vx -= fx;
                        left.vy -= fy;
                        right.vx += fx;
                        right.vy += fy;
                    }
                }

                edges.forEach((edge) => {
                    const source = this.positions.get(edge.source);
                    const target = this.positions.get(edge.target);
                    if (!source || !target) return;
                    const dx = target.x - source.x;
                    const dy = target.y - source.y;
                    const distance = Math.max(1, Math.hypot(dx, dy));
                    const desired = idealDistance / Math.sqrt(Math.max(0.25, edge.weight));
                    const force = (distance - desired) * 0.006 * cooling;
                    const fx = dx / distance * force;
                    const fy = dy / distance * force;
                    source.vx += fx;
                    source.vy += fy;
                    target.vx -= fx;
                    target.vy -= fy;
                });

                nodes.forEach((node) => {
                    const position = this.positions.get(node.id);
                    position.x = clamp(position.x + position.vx * cooling, -720, 720);
                    position.y = clamp(position.y + position.vy * cooling, -480, 480);
                });
            }
        }

        setMetric(metric) {
            this.metric = metric;
            this.draw();
        }

        setSelection(nodeId, edgeKey = null) {
            this.selectedNodeId = nodeId;
            this.selectedEdgeKey = edgeKey;
            this.draw();
        }

        resetView() {
            this.zoom = 0.82;
            this.pan = { x: 0, y: 0 };
            this.draw();
        }

        screenPoint(worldPoint) {
            return {
                x: this.cssWidth / 2 + (worldPoint.x + this.pan.x) * this.zoom,
                y: this.cssHeight / 2 + (worldPoint.y + this.pan.y) * this.zoom,
            };
        }

        worldPoint(screenPoint) {
            return {
                x: (screenPoint.x - this.cssWidth / 2) / this.zoom - this.pan.x,
                y: (screenPoint.y - this.cssHeight / 2) / this.zoom - this.pan.y,
            };
        }

        canvasPoint(clientX, clientY) {
            const rect = this.canvas.getBoundingClientRect();
            return { x: clientX - rect.left, y: clientY - rect.top };
        }

        metricMaximum() {
            if (!this.graph) return 1;
            return Math.max(1e-9, ...this.graph.nodes.map((node) => this.graph.metrics.get(node.id)?.[this.metric] || 0));
        }

        nodeRadius(node, maximum = this.metricMaximum()) {
            const value = this.graph?.metrics.get(node.id)?.[this.metric] || 0;
            return 6 + Math.sqrt(value / maximum) * 13;
        }

        nodeAt(screenPoint) {
            if (!this.graph) return null;
            const maximum = this.metricMaximum();
            return [...this.graph.nodes].reverse().find((node) => {
                const position = this.screenPoint(this.positions.get(node.id));
                return Math.hypot(screenPoint.x - position.x, screenPoint.y - position.y) <= this.nodeRadius(node, maximum) + 5;
            }) || null;
        }

        edgeAt(screenPoint) {
            if (!this.graph) return null;
            let best = null;
            let bestDistance = 7;
            this.graph.displayedEdges.forEach((edge) => {
                const source = this.positions.get(edge.source);
                const target = this.positions.get(edge.target);
                if (!source || !target) return;
                const distance = distanceToSegment(screenPoint, this.screenPoint(source), this.screenPoint(target));
                if (distance < bestDistance) {
                    best = edge;
                    bestDistance = distance;
                }
            });
            return best;
        }

        beginPointer(clientX, clientY) {
            const screen = this.canvasPoint(clientX, clientY);
            const node = this.nodeAt(screen);
            this.pointerState = node
                ? { mode: "node", nodeId: node.id, start: screen, moved: false }
                : { mode: "pan", start: screen, pan: { ...this.pan }, moved: false };
            return node;
        }

        movePointer(clientX, clientY) {
            if (!this.pointerState) return;
            const screen = this.canvasPoint(clientX, clientY);
            const dx = screen.x - this.pointerState.start.x;
            const dy = screen.y - this.pointerState.start.y;
            this.pointerState.moved ||= Math.hypot(dx, dy) > 3;
            if (this.pointerState.mode === "node") {
                const world = this.worldPoint(screen);
                const position = this.positions.get(this.pointerState.nodeId);
                if (position) {
                    position.x = world.x;
                    position.y = world.y;
                    position.vx = 0;
                    position.vy = 0;
                }
            } else {
                this.pan.x = this.pointerState.pan.x + dx / this.zoom;
                this.pan.y = this.pointerState.pan.y + dy / this.zoom;
            }
            this.draw();
        }

        endPointer(clientX, clientY) {
            if (!this.pointerState) return { node: null, edge: null };
            const state = this.pointerState;
            this.pointerState = null;
            if (state.moved) return { node: null, edge: null };
            const screen = this.canvasPoint(clientX, clientY);
            return { node: this.nodeAt(screen), edge: this.edgeAt(screen) };
        }

        updateHover(clientX, clientY) {
            if (this.pointerState) return;
            const node = this.nodeAt(this.canvasPoint(clientX, clientY));
            const next = node?.id || null;
            if (next !== this.hoveredNodeId) {
                this.hoveredNodeId = next;
                this.canvas.style.cursor = node ? "pointer" : "grab";
                this.draw();
            }
        }

        zoomAt(clientX, clientY, delta) {
            const screen = this.canvasPoint(clientX, clientY);
            const before = this.worldPoint(screen);
            this.zoom = clamp(this.zoom * (delta > 0 ? 0.88 : 1.14), 0.25, 3.2);
            const after = this.worldPoint(screen);
            this.pan.x += after.x - before.x;
            this.pan.y += after.y - before.y;
            this.draw();
        }

        panBy(x, y) {
            this.pan.x += x / this.zoom;
            this.pan.y += y / this.zoom;
            this.draw();
        }

        draw() {
            const context = this.context;
            context.clearRect(0, 0, this.cssWidth, this.cssHeight);
            context.fillStyle = "#f7f4ed";
            context.fillRect(0, 0, this.cssWidth, this.cssHeight);
            if (!this.graph) return;

            const selectedNeighbors = new Set();
            if (this.selectedNodeId) {
                this.graph.edges.forEach((edge) => {
                    if (edge.source === this.selectedNodeId) selectedNeighbors.add(edge.target);
                    if (edge.target === this.selectedNodeId) selectedNeighbors.add(edge.source);
                });
            }

            this.graph.displayedEdges.forEach((edge) => {
                const source = this.positions.get(edge.source);
                const target = this.positions.get(edge.target);
                if (!source || !target) return;
                const start = this.screenPoint(source);
                const end = this.screenPoint(target);
                const highlighted = edge.key === this.selectedEdgeKey || edge.source === this.selectedNodeId || edge.target === this.selectedNodeId;
                context.beginPath();
                context.moveTo(start.x, start.y);
                context.lineTo(end.x, end.y);
                context.strokeStyle = highlighted ? "rgba(150, 67, 45, 0.88)" : "rgba(48, 66, 75, 0.20)";
                context.lineWidth = highlighted ? Math.min(6, 1.5 + edge.weight * 1.2) : Math.min(3.2, 0.35 + edge.weight * 0.65);
                context.setLineDash(edge.uncertain ? [5, 4] : []);
                context.stroke();
            });
            context.setLineDash([]);

            const maximum = this.metricMaximum();
            const ranked = new Set([...this.graph.nodes]
                .sort((left, right) => (this.graph.metrics.get(right.id)?.[this.metric] || 0) - (this.graph.metrics.get(left.id)?.[this.metric] || 0))
                .slice(0, 10).map((node) => node.id));

            this.graph.nodes.forEach((node) => {
                const position = this.screenPoint(this.positions.get(node.id));
                const radius = this.nodeRadius(node, maximum);
                const selected = node.id === this.selectedNodeId;
                const seed = node.selectionReason === "seed" || node.isSeed;
                context.beginPath();
                context.arc(position.x, position.y, radius, 0, Math.PI * 2);
                context.fillStyle = selected ? "#a34734" : seed ? "#244e67" : selectedNeighbors.has(node.id) ? "#6c8e75" : "#d5c7aa";
                context.fill();
                context.strokeStyle = selected || seed ? "#fff" : "#5f655f";
                context.lineWidth = selected ? 3 : 1.2;
                context.stroke();

                if (ranked.has(node.id) || selected || node.id === this.hoveredNodeId) {
                    context.font = selected ? "700 13px Yu Gothic, sans-serif" : "600 11px Yu Gothic, sans-serif";
                    context.textAlign = "center";
                    context.textBaseline = "top";
                    const label = node.displayNameJa || node.preferredName;
                    const width = context.measureText(label).width + 8;
                    context.fillStyle = "rgba(247, 244, 237, 0.88)";
                    context.fillRect(position.x - width / 2, position.y + radius + 3, width, 17);
                    context.fillStyle = "#26343b";
                    context.fillText(label, position.x, position.y + radius + 5);
                }
            });
        }
    }

    globalScope.NaturalPhilosophyNetworkRenderer = NaturalPhilosophyNetworkRenderer;
}(typeof globalThis !== "undefined" ? globalThis : window));
