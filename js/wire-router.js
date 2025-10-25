// Wire Routing Module
// Handles wire drawing, routing algorithms, and wire management

const WireRouter = {
    // State
    state: {
        isDrawing: false,
        startInstance: null,
        startEndpoint: null,
        waypoints: [],
        orthogonalMode: true,  // false when Alt is held
        nextWireId: 1,
        selectedWires: []  // Array of selected wire IDs
    },

    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        const canvas = document.getElementById('canvas');

        // Canvas click for waypoints
        canvas?.addEventListener('click', (e) => {
            if (this.state.isDrawing && !e.target.closest('.component-endpoint')) {
                this.handleCanvasClick(e);
            }
        });

        // Escape to cancel
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.state.isDrawing) {
                this.cancelWire();
            }
        });

        // Alt/Option key for free-angle mode
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Alt') {
                this.state.orthogonalMode = false;
                if (this.state.isDrawing) {
                    App.setStatus('Free-angle mode enabled (hold Alt)', 'info');
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'Alt') {
                this.state.orthogonalMode = true;
                if (this.state.isDrawing) {
                    App.setStatus('Orthogonal mode (release Alt for free angles)', 'info');
                }
            }
        });

        // Mouse move for preview
        canvas?.addEventListener('mousemove', (e) => {
            if (this.state.isDrawing) {
                this.handleMouseMove(e);
            }
        });
    },

    handleEndpointClick(instance, endpoint, e) {
        e.stopPropagation();

        if (!this.state.isDrawing) {
            // Start new wire
            this.startWire(instance, endpoint);
        } else {
            // Complete wire to this endpoint
            this.completeWire(instance, endpoint);
        }
    },

    startWire(instance, endpoint) {
        this.state.isDrawing = true;
        this.state.startInstance = instance;
        this.state.startEndpoint = endpoint;
        this.state.waypoints = [];

        // Calculate world position of endpoint
        const endpointWorld = this.getEndpointWorldPosition(instance, endpoint);
        this.state.waypoints.push(endpointWorld);

        App.setStatus(`Drawing wire from ${instance.componentDef.name}. Click to add waypoints or click another endpoint to auto-route.`, 'info');
        console.log('Started wire from', instance.id, endpoint.id);

        // Highlight start endpoint
        this.highlightEndpoint(instance, endpoint, true);
    },

    handleCanvasClick(e) {
        // Add waypoint at clicked grid position
        const gridPos = Canvas.screenToGrid(e.clientX, e.clientY);
        const worldPos = Canvas.gridToWorld(gridPos.x, gridPos.y);

        // In orthogonal mode, snap the waypoint to create clean 90° angles
        if (this.state.orthogonalMode && this.state.waypoints.length > 0) {
            const lastPoint = this.state.waypoints[this.state.waypoints.length - 1];
            const dx = Math.abs(worldPos.x - lastPoint.x);
            const dy = Math.abs(worldPos.y - lastPoint.y);

            if (dx > dy) {
                // Snap to horizontal (keep Y from last point)
                worldPos.y = lastPoint.y;
            } else {
                // Snap to vertical (keep X from last point)
                worldPos.x = lastPoint.x;
            }
        }

        this.state.waypoints.push(worldPos);
        this.updateWirePreview();

        const modeText = this.state.orthogonalMode ? '(hold Alt for free angles)' : '(Alt: free angle mode)';
        App.setStatus(`Waypoint ${this.state.waypoints.length} added ${modeText}`, 'info');
    },

    handleMouseMove(e) {
        if (!this.state.isDrawing) return;
        this.updateWirePreview(e);
    },

    completeWire(endInstance, endEndpoint) {
        const endpointWorld = this.getEndpointWorldPosition(endInstance, endEndpoint);

        // Check if this is a direct connection (no manual waypoints)
        if (this.state.waypoints.length === 1) {
            // Auto-route from start to end
            const startWorld = this.state.waypoints[0];
            const path = this.findManhattanPath(startWorld, endpointWorld);
            this.state.waypoints = path;
        } else {
            // Add end endpoint as final waypoint
            this.state.waypoints.push(endpointWorld);
        }

        // Create wire object
        const wire = {
            id: `wire-${this.state.nextWireId++}`,
            startInstance: this.state.startInstance.id,
            startEndpoint: this.state.startEndpoint.id,
            endInstance: endInstance.id,
            endEndpoint: endEndpoint.id,
            waypoints: [...this.state.waypoints],
            orthogonal: this.state.orthogonalMode
        };

        // Add to schematic
        SchematicManager.state.wires.push(wire);

        // Render wire
        this.renderWire(wire);

        App.setStatus(`Wire created from ${this.state.startInstance.componentDef.name} to ${endInstance.componentDef.name}`, 'success');
        console.log('Created wire:', wire);

        this.cancelWire();
    },

    cancelWire() {
        if (this.state.startInstance && this.state.startEndpoint) {
            this.highlightEndpoint(this.state.startInstance, this.state.startEndpoint, false);
        }

        this.state.isDrawing = false;
        this.state.startInstance = null;
        this.state.startEndpoint = null;
        this.state.waypoints = [];

        this.clearWirePreview();
        App.setStatus('Wire cancelled', 'info');
    },

    updateWirePreview(mouseEvent = null) {
        const previewLayer = document.getElementById('wire-preview-layer');
        if (!previewLayer) return;

        previewLayer.innerHTML = '';

        if (this.state.waypoints.length === 0) return;

        // Build path
        let pathData = `M ${this.state.waypoints[0].x} ${this.state.waypoints[0].y}`;

        for (let i = 1; i < this.state.waypoints.length; i++) {
            const point = this.state.waypoints[i];
            pathData += ` L ${point.x} ${point.y}`;
        }

        // Add line to current mouse position if available
        if (mouseEvent) {
            const gridPos = Canvas.screenToGrid(mouseEvent.clientX, mouseEvent.clientY);
            const worldPos = Canvas.gridToWorld(gridPos.x, gridPos.y);

            if (this.state.orthogonalMode) {
                // Snap to horizontal or vertical
                const lastPoint = this.state.waypoints[this.state.waypoints.length - 1];
                const dx = Math.abs(worldPos.x - lastPoint.x);
                const dy = Math.abs(worldPos.y - lastPoint.y);

                if (dx > dy) {
                    // Horizontal
                    pathData += ` L ${worldPos.x} ${lastPoint.y}`;
                } else {
                    // Vertical
                    pathData += ` L ${lastPoint.x} ${worldPos.y}`;
                }
            } else {
                // Direct line (allows 45° angles)
                pathData += ` L ${worldPos.x} ${worldPos.y}`;
            }
        }

        // Create preview path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.classList.add('wire-preview');
        path.setAttribute('d', pathData);
        previewLayer.appendChild(path);

        // Draw waypoint markers
        this.state.waypoints.forEach((wp, i) => {
            if (i > 0) { // Skip first point (on endpoint)
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.classList.add('wire-waypoint');
                circle.setAttribute('cx', wp.x);
                circle.setAttribute('cy', wp.y);
                circle.setAttribute('r', '4');
                previewLayer.appendChild(circle);
            }
        });
    },

    clearWirePreview() {
        const previewLayer = document.getElementById('wire-preview-layer');
        if (previewLayer) {
            previewLayer.innerHTML = '';
        }
    },

    renderWire(wire) {
        const wiresLayer = document.getElementById('wires-layer');

        // Build path from waypoints
        let pathData = `M ${wire.waypoints[0].x} ${wire.waypoints[0].y}`;

        for (let i = 1; i < wire.waypoints.length; i++) {
            pathData += ` L ${wire.waypoints[i].x} ${wire.waypoints[i].y}`;
        }

        // Create wire path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.classList.add('wire');
        path.setAttribute('d', pathData);
        path.dataset.wireId = wire.id;

        // Click to select wire or connect to it
        path.addEventListener('click', (e) => {
            e.stopPropagation();

            if (this.state.isDrawing) {
                // Connect to this wire (create junction)
                this.connectToWire(wire, e);
            } else {
                this.selectWire(wire.id, e.shiftKey);
            }
        });

        wiresLayer.appendChild(path);

        // Add junction dots only where wires actually split/join
        // For now, we'll skip junction dots on single wires
        // They'll be added in the future when we detect wire intersections

        wire._svgElement = path;
    },

    selectWire(wireId, multiSelect = false) {
        console.log('Selecting wire:', wireId);

        // Clear component selection
        SchematicManager.clearSelection();

        if (!multiSelect) {
            this.clearWireSelection();
        }

        if (!this.state.selectedWires.includes(wireId)) {
            this.state.selectedWires.push(wireId);
        }

        this.updateWireSelectionVisuals();
        App.setStatus('Wire selected (press Delete to remove)', 'info');
    },

    clearWireSelection() {
        this.state.selectedWires = [];
        this.updateWireSelectionVisuals();
    },

    updateWireSelectionVisuals() {
        // Remove selection from all wires
        document.querySelectorAll('.wire.selected').forEach(el => {
            el.classList.remove('selected');
        });

        // Add selection to selected wires
        this.state.selectedWires.forEach(wireId => {
            const wire = SchematicManager.state.wires.find(w => w.id === wireId);
            if (wire && wire._svgElement) {
                wire._svgElement.classList.add('selected');
            }
        });
    },

    deleteSelectedWires() {
        if (this.state.selectedWires.length === 0) return;

        const count = this.state.selectedWires.length;

        // Remove from DOM and state
        this.state.selectedWires.forEach(wireId => {
            const wire = SchematicManager.state.wires.find(w => w.id === wireId);
            if (wire && wire._svgElement) {
                wire._svgElement.remove();

                // Remove any junctions associated with this wire
                document.querySelectorAll(`[data-wire-id="${wireId}"]`).forEach(el => el.remove());
            }

            // Remove from state
            SchematicManager.state.wires = SchematicManager.state.wires.filter(w => w.id !== wireId);
        });

        this.clearWireSelection();
        App.setStatus(`Deleted ${count} wire${count > 1 ? 's' : ''}`, 'success');
    },

    connectToWire(targetWire, event) {
        // Find closest point on wire to click location
        const clickWorld = Canvas.screenToWorld(event.clientX, event.clientY);
        const clickGrid = Canvas.worldToGrid(clickWorld.x, clickWorld.y);
        const junctionPoint = Canvas.gridToWorld(clickGrid.x, clickGrid.y);

        // Add junction point to waypoints
        this.state.waypoints.push(junctionPoint);

        // Create the wire (it ends at the junction)
        const wire = {
            id: `wire-${this.state.nextWireId++}`,
            startInstance: this.state.startInstance.id,
            startEndpoint: this.state.startEndpoint.id,
            endInstance: null,  // Ends at wire junction
            endEndpoint: null,
            targetWire: targetWire.id,
            junctionPoint: junctionPoint,
            waypoints: [...this.state.waypoints],
            orthogonal: this.state.orthogonalMode
        };

        SchematicManager.state.wires.push(wire);
        this.renderWire(wire);

        // Add junction dot at connection point
        this.addJunctionDot(junctionPoint, wire.id);

        App.setStatus(`Wire connected to existing wire`, 'success');
        console.log('Created wire junction:', wire);

        this.cancelWire();
    },

    addJunctionDot(position, wireId) {
        const wiresLayer = document.getElementById('wires-layer');

        const junction = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        junction.classList.add('wire-junction');
        junction.setAttribute('cx', position.x);
        junction.setAttribute('cy', position.y);
        junction.setAttribute('r', '4');
        junction.dataset.wireId = wireId;

        wiresLayer.appendChild(junction);
    },

    getEndpointWorldPosition(instance, endpoint) {
        const componentWorldPos = Canvas.gridToWorld(instance.gridX, instance.gridY);
        const endpointGridOffset = Canvas.gridToWorld(endpoint.x, endpoint.y);

        return {
            x: componentWorldPos.x + endpointGridOffset.x,
            y: componentWorldPos.y + endpointGridOffset.y
        };
    },

    highlightEndpoint(instance, endpoint, active) {
        if (!instance._svgElement) return;

        const endpointEl = instance._svgElement.querySelector(`[data-endpoint-id="${endpoint.id}"]`);
        if (endpointEl) {
            if (active) {
                endpointEl.classList.add('active');
                endpointEl.setAttribute('r', '5');
            } else {
                endpointEl.classList.remove('active');
                endpointEl.classList.remove('hover');
                endpointEl.setAttribute('fill', 'transparent');
                endpointEl.setAttribute('r', '8');
            }
        }
    },

    // Manhattan routing algorithm with obstacle avoidance and direction preference
    findManhattanPath(start, end) {
        const waypoints = [start];

        // Get component instances and their directions
        const startDir = this.state.startEndpoint.direction;
        const endInstance = SchematicManager.state.components.find(c =>
            c.componentDef.endpoints.some(ep => {
                const epWorld = this.getEndpointWorldPosition(c, ep);
                return Math.abs(epWorld.x - end.x) < 1 && Math.abs(epWorld.y - end.y) < 1;
            })
        );

        let endDir = null;
        if (endInstance) {
            const endEp = endInstance.componentDef.endpoints.find(ep => {
                const epWorld = this.getEndpointWorldPosition(endInstance, ep);
                return Math.abs(epWorld.x - end.x) < 1 && Math.abs(epWorld.y - end.y) < 1;
            });
            endDir = endEp?.direction;
        }

        // Calculate distances
        const dx = end.x - start.x;
        const dy = end.y - start.y;

        // Prefer entering components parallel to their endpoint direction
        // This creates cleaner schematics with two bends in the middle

        // Exit start component in its natural direction
        let exitPoint = { ...start };
        const exitDistance = Canvas.state.gridSize * 2; // Move 2 grid units out

        switch (startDir) {
            case 'left':
                exitPoint.x -= exitDistance;
                break;
            case 'right':
                exitPoint.x += exitDistance;
                break;
            case 'up':
                exitPoint.y -= exitDistance;
                break;
            case 'down':
                exitPoint.y += exitDistance;
                break;
        }

        // Enter end component in its natural direction
        let entryPoint = { ...end };

        switch (endDir) {
            case 'left':
                entryPoint.x -= exitDistance;
                break;
            case 'right':
                entryPoint.x += exitDistance;
                break;
            case 'up':
                entryPoint.y -= exitDistance;
                break;
            case 'down':
                entryPoint.y += exitDistance;
                break;
        }

        // Build path: start -> exit -> middle -> entry -> end
        waypoints.push(exitPoint);

        // Add middle waypoints to connect exit to entry
        if (Math.abs(exitPoint.x - entryPoint.x) > 1 && Math.abs(exitPoint.y - entryPoint.y) > 1) {
            // Need two bends
            // Check for obstacles and route around them
            const obstacles = this.getObstacles();
            const midPath = this.routeAroundObstacles(exitPoint, entryPoint, obstacles);
            waypoints.push(...midPath);
        }

        if (endDir) {
            waypoints.push(entryPoint);
        }

        waypoints.push(end);

        return waypoints;
    },

    getObstacles() {
        // Get bounding boxes of all components
        const obstacles = [];

        SchematicManager.state.components.forEach(comp => {
            const worldPos = Canvas.gridToWorld(comp.gridX, comp.gridY);
            const width = comp.componentDef.width * Canvas.state.gridSize;
            const height = comp.componentDef.height * Canvas.state.gridSize;

            obstacles.push({
                x: worldPos.x,
                y: worldPos.y,
                width: width,
                height: height,
                componentId: comp.id
            });
        });

        return obstacles;
    },

    routeAroundObstacles(start, end, obstacles) {
        // Simple obstacle avoidance - try horizontal first, then vertical
        // Check if direct path is clear
        const midpoints = [];

        // Try horizontal then vertical
        const midH = { x: end.x, y: start.y };

        if (!this.pathIntersectsObstacles(start, midH, obstacles) &&
            !this.pathIntersectsObstacles(midH, end, obstacles)) {
            midpoints.push(midH);
            return midpoints;
        }

        // Try vertical then horizontal
        const midV = { x: start.x, y: end.y };

        if (!this.pathIntersectsObstacles(start, midV, obstacles) &&
            !this.pathIntersectsObstacles(midV, end, obstacles)) {
            midpoints.push(midV);
            return midpoints;
        }

        // If both blocked, route around (simple avoidance)
        // Find a clear horizontal level between components
        const clearY = this.findClearHorizontalLevel(start.y, end.y, obstacles);
        if (clearY !== null) {
            midpoints.push({ x: start.x, y: clearY });
            midpoints.push({ x: end.x, y: clearY });
        } else {
            // Fallback to direct path even if it overlaps
            midpoints.push(midH);
        }

        return midpoints;
    },

    pathIntersectsObstacles(p1, p2, obstacles) {
        // Check if line segment intersects any obstacle rectangles
        const margin = 5; // Margin around components

        for (const obs of obstacles) {
            const obsBox = {
                left: obs.x - margin,
                right: obs.x + obs.width + margin,
                top: obs.y - margin,
                bottom: obs.y + obs.height + margin
            };

            // Check if horizontal line segment intersects obstacle
            if (Math.abs(p1.y - p2.y) < 1) {
                // Horizontal line
                const y = p1.y;
                const minX = Math.min(p1.x, p2.x);
                const maxX = Math.max(p1.x, p2.x);

                if (y >= obsBox.top && y <= obsBox.bottom &&
                    maxX >= obsBox.left && minX <= obsBox.right) {
                    return true;
                }
            }

            // Check if vertical line segment intersects obstacle
            if (Math.abs(p1.x - p2.x) < 1) {
                // Vertical line
                const x = p1.x;
                const minY = Math.min(p1.y, p2.y);
                const maxY = Math.max(p1.y, p2.y);

                if (x >= obsBox.left && x <= obsBox.right &&
                    maxY >= obsBox.top && minY <= obsBox.bottom) {
                    return true;
                }
            }
        }

        return false;
    },

    findClearHorizontalLevel(startY, endY, obstacles) {
        // Find a Y coordinate between start and end that's clear of obstacles
        const minY = Math.min(startY, endY);
        const maxY = Math.max(startY, endY);
        const gridSize = Canvas.state.gridSize;

        // Try levels between components
        for (let y = minY; y <= maxY; y += gridSize) {
            let clear = true;

            for (const obs of obstacles) {
                if (y >= obs.y && y <= obs.y + obs.height) {
                    clear = false;
                    break;
                }
            }

            if (clear) return y;
        }

        // Try above and below
        for (let offset = gridSize; offset < gridSize * 10; offset += gridSize) {
            const yAbove = minY - offset;
            const yBelow = maxY + offset;

            // Try above
            let clearAbove = true;
            for (const obs of obstacles) {
                if (yAbove >= obs.y && yAbove <= obs.y + obs.height) {
                    clearAbove = false;
                    break;
                }
            }
            if (clearAbove) return yAbove;

            // Try below
            let clearBelow = true;
            for (const obs of obstacles) {
                if (yBelow >= obs.y && yBelow <= obs.y + obs.height) {
                    clearBelow = false;
                    break;
                }
            }
            if (clearBelow) return yBelow;
        }

        return null; // No clear path found
    }
};
