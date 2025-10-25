// Drag and Drop Module
// Handles dragging components from panel to canvas and within canvas

const DragDrop = {
    // State
    state: {
        isDraggingFromPanel: false,
        isDraggingOnCanvas: false,
        draggedComponent: null,
        draggedInstance: null,
        ghostElement: null,
        previewElement: null,
        dragStartX: 0,
        dragStartY: 0,
        offsetGridX: 0,
        offsetGridY: 0
    },

    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        // ========== Drag from panel to canvas ==========
        document.getElementById('components-list')?.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('component-item') ||
                e.target.closest('.component-item')) {
                const item = e.target.closest('.component-item');
                this.handlePanelDragStart(e, item);
            }
        });

        const container = document.getElementById('canvas-container');

        container?.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (this.state.isDraggingFromPanel) {
                this.handlePanelDragOver(e);
            }
        });

        container?.addEventListener('drop', (e) => {
            e.preventDefault();
            if (this.state.isDraggingFromPanel) {
                this.handlePanelDrop(e);
            }
        });

        document.addEventListener('dragend', () => {
            this.handlePanelDragEnd();
        });

        // ========== Drag components on canvas ==========
        document.addEventListener('mousemove', (e) => {
            if (this.state.isDraggingOnCanvas) {
                this.handleCanvasDragMove(e);
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.state.isDraggingOnCanvas) {
                this.handleCanvasDragEnd();
            }
        });
    },

    // ========== Panel to Canvas Drag ==========
    handlePanelDragStart(e, item) {
        this.state.isDraggingFromPanel = true;
        this.state.draggedComponent = item.__componentData;

        // Create ghost element
        const ghost = document.createElement('div');
        ghost.className = 'drag-ghost';
        ghost.innerHTML = item.querySelector('.component-icon').innerHTML;
        document.body.appendChild(ghost);
        this.state.ghostElement = ghost;

        // Set drag data
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setDragImage(ghost, 24, 24);

        item.classList.add('dragging');
    },

    handlePanelDragOver(e) {
        if (!this.state.isDraggingFromPanel) return;

        // Update ghost position
        if (this.state.ghostElement) {
            this.state.ghostElement.style.left = e.clientX + 'px';
            this.state.ghostElement.style.top = e.clientY + 'px';
        }

        // Show snap preview
        const gridPos = Canvas.screenToGrid(e.clientX, e.clientY);
        this.showSnapPreview(gridPos.x, gridPos.y, this.state.draggedComponent);
    },

    handlePanelDrop(e) {
        if (!this.state.isDraggingFromPanel || !this.state.draggedComponent) return;

        e.stopPropagation(); // Prevent canvas click handler from firing

        // Get drop position in grid coordinates
        const gridPos = Canvas.screenToGrid(e.clientX, e.clientY);

        console.log('Dropping component at grid:', gridPos);

        // Create component instance via SchematicManager
        const instance = SchematicManager.createComponentInstance(this.state.draggedComponent, gridPos.x, gridPos.y);

        this.hideSnapPreview();

        // Automatically select the newly placed component
        // Use double requestAnimationFrame to ensure DOM is fully rendered
        if (instance) {
            console.log('Requesting auto-selection for:', instance.id);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    console.log('Executing auto-selection for:', instance.id);
                    SchematicManager.selectComponent(instance.id, false);
                });
            });
        }
    },

    handlePanelDragEnd() {
        // Clean up
        if (this.state.ghostElement) {
            document.body.removeChild(this.state.ghostElement);
            this.state.ghostElement = null;
        }

        this.hideSnapPreview();

        document.querySelectorAll('.component-item.dragging').forEach(item => {
            item.classList.remove('dragging');
        });

        this.state.isDraggingFromPanel = false;
        this.state.draggedComponent = null;
    },

    // ========== Canvas Drag (move existing components) ==========
    startCanvasDrag(instance, e) {
        this.state.isDraggingOnCanvas = true;
        this.state.draggedInstance = instance;

        // Calculate offset from component origin to mouse
        const gridPos = Canvas.screenToGrid(e.clientX, e.clientY);
        this.state.offsetGridX = instance.gridX - gridPos.x;
        this.state.offsetGridY = instance.gridY - gridPos.y;

        // Add dragging class
        if (instance._svgElement) {
            instance._svgElement.classList.add('dragging');
        }

        App.setStatus(`Moving ${instance.componentDef.name}...`, 'info');
    },

    handleCanvasDragMove(e) {
        if (!this.state.isDraggingOnCanvas || !this.state.draggedInstance) return;

        // Get new grid position with offset
        const gridPos = Canvas.screenToGrid(e.clientX, e.clientY);
        const newGridX = gridPos.x + this.state.offsetGridX;
        const newGridY = gridPos.y + this.state.offsetGridY;

        // Update instance position
        this.state.draggedInstance.gridX = newGridX;
        this.state.draggedInstance.gridY = newGridY;

        // Update visual position
        SchematicManager.updateComponentTransform(this.state.draggedInstance);

        // Update selection box position
        SchematicManager.updateSelectionVisuals();
    },

    handleCanvasDragEnd() {
        if (this.state.draggedInstance && this.state.draggedInstance._svgElement) {
            this.state.draggedInstance._svgElement.classList.remove('dragging');
        }

        App.setStatus('Component moved', 'success');

        this.state.isDraggingOnCanvas = false;
        this.state.draggedInstance = null;
    },

    // ========== Snap Preview ==========
    showSnapPreview(gridX, gridY, component) {
        this.hideSnapPreview();

        const worldPos = Canvas.gridToWorld(gridX, gridY);
        const previewLayer = document.getElementById('selection-layer');

        // Create preview rectangle
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.classList.add('snap-guide');
        rect.setAttribute('x', worldPos.x);
        rect.setAttribute('y', worldPos.y);
        rect.setAttribute('width', component.width * Canvas.state.gridSize);
        rect.setAttribute('height', component.height * Canvas.state.gridSize);
        rect.setAttribute('rx', '2');

        previewLayer.appendChild(rect);
        this.state.previewElement = rect;
    },

    hideSnapPreview() {
        if (this.state.previewElement) {
            this.state.previewElement.remove();
            this.state.previewElement = null;
        }
    }
};
