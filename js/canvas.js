// Canvas Management Module
// Handles the SVG canvas, grid, zoom, pan, and coordinate transformations

const Canvas = {
    // State
    state: {
        zoom: 1,
        panX: 0,
        panY: 0,
        gridSize: 80,  // Snap to visible grid dots
        showGrid: true,
        isPanning: false,
        lastMouseX: 0,
        lastMouseY: 0
    },

    // Elements
    elements: {
        canvas: null,
        content: null,
        container: null,
        gridBackground: null
    },

    init() {
        // Get DOM elements
        this.elements.canvas = document.getElementById('canvas');
        this.elements.content = document.getElementById('canvas-content');
        this.elements.container = document.getElementById('canvas-container');
        this.elements.gridBackground = document.getElementById('grid-background');

        // Load preferences
        const prefs = Storage.getPreferences();
        this.state.gridSize = prefs.gridSize || 80;
        this.state.showGrid = prefs.showGrid !== false;

        // Update grid pattern
        this.updateGridPattern();

        // Set up event listeners
        this.setupEventListeners();

        // Initial render
        this.updateTransform();
        this.updateZoomDisplay();
    },

    setupEventListeners() {
        const container = this.elements.container;

        // Zoom with mouse wheel
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoom(delta, e.clientX, e.clientY);
        }, { passive: false });

        // Pan with middle mouse or space+drag
        container.addEventListener('mousedown', (e) => {
            if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
                e.preventDefault();
                this.startPan(e);
            }
        });

        container.addEventListener('mousemove', (e) => {
            if (this.state.isPanning) {
                this.updatePan(e);
            }
            this.updateCursorPosition(e);
        });

        container.addEventListener('mouseup', () => {
            this.endPan();
        });

        container.addEventListener('mouseleave', () => {
            this.endPan();
        });

        // Zoom buttons
        document.getElementById('zoom-in')?.addEventListener('click', () => {
            this.zoom(1.2);
        });

        document.getElementById('zoom-out')?.addEventListener('click', () => {
            this.zoom(0.8);
        });

        document.getElementById('fit-to-screen')?.addEventListener('click', () => {
            this.fitToScreen();
        });

        // Grid toggle
        document.getElementById('toggle-grid')?.addEventListener('click', () => {
            this.toggleGrid();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;

            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                this.zoom(1.2);
            } else if (e.key === '-') {
                e.preventDefault();
                this.zoom(0.8);
            } else if (e.key === '0') {
                e.preventDefault();
                this.resetView();
            }
        });
    },

    // Zoom
    zoom(factor, clientX, clientY) {
        const oldZoom = this.state.zoom;
        const newZoom = Math.max(0.25, Math.min(4, oldZoom * factor));

        if (clientX !== undefined && clientY !== undefined) {
            // Zoom towards cursor position
            const rect = this.elements.container.getBoundingClientRect();
            const x = clientX - rect.left;
            const y = clientY - rect.top;

            const worldX = (x - this.state.panX) / oldZoom;
            const worldY = (y - this.state.panY) / oldZoom;

            this.state.panX = x - worldX * newZoom;
            this.state.panY = y - worldY * newZoom;
        }

        this.state.zoom = newZoom;
        this.updateTransform();
        this.updateZoomDisplay();
        this.updateGridPattern(); // Update grid density based on zoom
    },

    // Pan
    startPan(e) {
        this.state.isPanning = true;
        this.state.lastMouseX = e.clientX;
        this.state.lastMouseY = e.clientY;
        this.elements.container.classList.add('panning');
    },

    updatePan(e) {
        if (!this.state.isPanning) return;

        const dx = e.clientX - this.state.lastMouseX;
        const dy = e.clientY - this.state.lastMouseY;

        this.state.panX += dx;
        this.state.panY += dy;

        this.state.lastMouseX = e.clientX;
        this.state.lastMouseY = e.clientY;

        this.updateTransform();
    },

    endPan() {
        this.state.isPanning = false;
        this.elements.container.classList.remove('panning');
    },

    // Transform
    updateTransform() {
        const transform = `translate(${this.state.panX}, ${this.state.panY}) scale(${this.state.zoom})`;
        this.elements.content.setAttribute('transform', transform);
    },

    // Grid
    updateGridPattern() {
        const pattern = document.getElementById('grid-pattern');
        if (pattern) {
            // Calculate grid spacing to maintain consistent visual density at all zoom levels
            // The key insight: spacing in world units should scale with 1/zoom to maintain
            // constant screen-space density
            const targetScreenSpacing = 80; // Target spacing in screen pixels (increased to reduce clutter)
            const worldSpacing = targetScreenSpacing / this.state.zoom;

            // Round to nearest power of 2 times base grid size for clean snapping
            const baseGrid = this.state.gridSize;
            let multiplier = Math.max(1, Math.round(worldSpacing / baseGrid));

            // Ensure multiplier is a power of 2 for clean grid alignment
            multiplier = Math.pow(2, Math.round(Math.log2(multiplier)));

            const effectiveGridSize = baseGrid * multiplier;

            pattern.setAttribute('width', effectiveGridSize);
            pattern.setAttribute('height', effectiveGridSize);

            // Update circle position to center of pattern
            const circle = pattern.querySelector('circle');
            if (circle) {
                const center = effectiveGridSize / 2;
                circle.setAttribute('cx', center);
                circle.setAttribute('cy', center);

                // Keep dot size constant in world units so it appears constant on screen
                // when affected by zoom transform
                const baseRadius = 2;
                circle.setAttribute('r', baseRadius);
            }
        }

        if (!this.state.showGrid) {
            this.elements.gridBackground?.classList.add('hidden');
        } else {
            this.elements.gridBackground?.classList.remove('hidden');
        }
    },

    toggleGrid() {
        this.state.showGrid = !this.state.showGrid;
        this.updateGridPattern();

        const prefs = Storage.getPreferences();
        prefs.showGrid = this.state.showGrid;
        Storage.savePreferences(prefs);

        App.setStatus(`Grid ${this.state.showGrid ? 'visible' : 'hidden'}`, 'info');
    },

    // Fit to screen
    fitToScreen() {
        // TODO: Calculate bounds of all components and wires
        // For now, just reset view
        this.resetView();
    },

    resetView() {
        this.state.zoom = 1;
        this.state.panX = 0;
        this.state.panY = 0;
        this.updateTransform();
        this.updateZoomDisplay();
    },

    // UI updates
    updateZoomDisplay() {
        const display = document.getElementById('zoom-level');
        if (display) {
            display.textContent = `${Math.round(this.state.zoom * 100)}%`;
        }
    },

    updateCursorPosition(e) {
        const gridPos = this.screenToGrid(e.clientX, e.clientY);
        const display = document.getElementById('cursor-position');
        if (display) {
            display.textContent = `X: ${gridPos.x}, Y: ${gridPos.y}`;
        }
    },

    // Coordinate transformations
    screenToWorld(screenX, screenY) {
        const rect = this.elements.container.getBoundingClientRect();
        const x = (screenX - rect.left - this.state.panX) / this.state.zoom;
        const y = (screenY - rect.top - this.state.panY) / this.state.zoom;
        return { x, y };
    },

    worldToScreen(worldX, worldY) {
        const rect = this.elements.container.getBoundingClientRect();
        const x = worldX * this.state.zoom + this.state.panX + rect.left;
        const y = worldY * this.state.zoom + this.state.panY + rect.top;
        return { x, y };
    },

    screenToGrid(screenX, screenY) {
        const world = this.screenToWorld(screenX, screenY);
        return this.worldToGrid(world.x, world.y);
    },

    worldToGrid(worldX, worldY) {
        const gridX = Math.round(worldX / this.state.gridSize);
        const gridY = Math.round(worldY / this.state.gridSize);
        return { x: gridX, y: gridY };
    },

    gridToWorld(gridX, gridY) {
        return {
            x: gridX * this.state.gridSize,
            y: gridY * this.state.gridSize
        };
    },

    snapToGrid(worldX, worldY) {
        const grid = this.worldToGrid(worldX, worldY);
        return this.gridToWorld(grid.x, grid.y);
    }
};
