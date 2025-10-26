// Schematic Manager Module
// Manages component instances, wires, and overall schematic state

const SchematicManager = {
    // State
    state: {
        components: [],      // Component instances on canvas
        wires: [],          // Wires connecting components
        selectedItems: [],  // Currently selected components/wires
        nextInstanceId: 1,
        schematicName: 'Untitled Circuit'
    },

    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        // Keyboard shortcuts for selected items
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                this.deleteSelected();
                WireRouter.deleteSelectedWires();
            } else if (e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                this.rotateSelected();
            } else if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                this.flipSelected();
            } else if (e.key === 'l' || e.key === 'L') {
                e.preventDefault();
                this.labelSelected();
            }
        });

        // Click on canvas background to deselect
        document.getElementById('canvas-container')?.addEventListener('click', (e) => {
            if (e.target.id === 'canvas' || e.target.id === 'canvas-container' || e.target.id === 'grid-background') {
                console.log('Canvas background clicked, clearing selection');
                this.clearSelection();
            }
        });

        // Close context menu on canvas click
        document.getElementById('canvas-container')?.addEventListener('click', () => {
            this.hideContextMenu();
        });

        // Drag selection box
        const canvas = document.getElementById('canvas');
        let selectionBoxStart = null;
        let selectionBoxEl = null;

        canvas?.addEventListener('mousedown', (e) => {
            console.log('Canvas mousedown:', {
                button: e.button,
                shift: e.shiftKey,
                target: e.target.id,
                targetClass: e.target.className,
                closestComponent: e.target.closest('.component-instance')
            });

            if (e.button === 0 && !e.shiftKey && !e.altKey &&
                !e.target.closest('.component-instance') &&
                !WireRouter.state.isDrawing &&
                (e.target.id === 'canvas' || e.target.id === 'grid-background' ||
                 e.target.id === 'wires-layer' || e.target.id === 'components-layer' ||
                 e.target.id === 'selection-layer' || e.target.id === 'wire-preview-layer')) {
                console.log('Starting selection box');
                selectionBoxStart = Canvas.screenToWorld(e.clientX, e.clientY);
            }
        });

        canvas?.addEventListener('mousemove', (e) => {
            if (selectionBoxStart) {
                const current = Canvas.screenToWorld(e.clientX, e.clientY);

                if (!selectionBoxEl) {
                    console.log('Creating selection box element');
                    const selectionLayer = document.getElementById('selection-layer');
                    selectionBoxEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    selectionBoxEl.classList.add('drag-selection-box');
                    selectionLayer.appendChild(selectionBoxEl);
                }

                const x = Math.min(selectionBoxStart.x, current.x);
                const y = Math.min(selectionBoxStart.y, current.y);
                const width = Math.abs(current.x - selectionBoxStart.x);
                const height = Math.abs(current.y - selectionBoxStart.y);

                selectionBoxEl.setAttribute('x', x);
                selectionBoxEl.setAttribute('y', y);
                selectionBoxEl.setAttribute('width', width);
                selectionBoxEl.setAttribute('height', height);
            }
        });

        document.addEventListener('mouseup', () => {
            if (selectionBoxStart && selectionBoxEl) {
                console.log('Selection box mouseup - selecting components');
                const bounds = {
                    x: parseFloat(selectionBoxEl.getAttribute('x')),
                    y: parseFloat(selectionBoxEl.getAttribute('y')),
                    width: parseFloat(selectionBoxEl.getAttribute('width')),
                    height: parseFloat(selectionBoxEl.getAttribute('height'))
                };
                console.log('Selection bounds:', bounds);
                this.selectComponentsInBox(bounds);
                selectionBoxEl.remove();
                selectionBoxEl = null;
            }
            selectionBoxStart = null;
        });
    },

    // Create a new component instance
    createComponentInstance(componentDef, gridX, gridY) {
        const instance = {
            id: `comp-${this.state.nextInstanceId++}`,
            componentId: componentDef.id,
            componentDef: componentDef,
            gridX: gridX,
            gridY: gridY,
            rotation: 0,        // 0, 90, 180, 270
            flipX: false,
            flipY: false,
            label: ''
        };

        this.state.components.push(instance);
        this.renderComponentInstance(instance);

        App.setStatus(`Added ${componentDef.name}`, 'success');
        console.log('Created component instance:', instance);

        return instance;
    },

    renderComponentInstance(instance) {
        const worldPos = Canvas.gridToWorld(instance.gridX, instance.gridY);
        const componentsLayer = document.getElementById('components-layer');

        // Create SVG group for this instance
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.classList.add('component-instance');
        group.dataset.instanceId = instance.id;
        group.dataset.componentId = instance.componentDef.id;

        // Build transform string
        let transform = `translate(${worldPos.x}, ${worldPos.y})`;

        if (instance.rotation !== 0) {
            const centerX = instance.componentDef.width * Canvas.state.gridSize / 2;
            const centerY = instance.componentDef.height * Canvas.state.gridSize / 2;
            transform += ` rotate(${instance.rotation}, ${centerX}, ${centerY})`;
        }

        if (instance.flipX || instance.flipY) {
            const scaleX = instance.flipX ? -1 : 1;
            const scaleY = instance.flipY ? -1 : 1;
            const centerX = instance.componentDef.width * Canvas.state.gridSize / 2;
            const centerY = instance.componentDef.height * Canvas.state.gridSize / 2;
            transform += ` translate(${centerX}, ${centerY}) scale(${scaleX}, ${scaleY}) translate(${-centerX}, ${-centerY})`;
        }

        group.setAttribute('transform', transform);

        // Add component SVG with proper scaling
        const componentBody = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        componentBody.classList.add('component-body');

        // Extract viewBox from component SVG to determine original size
        const viewBox = this.extractComponentViewBox(instance.componentDef.svg);

        // Create a nested SVG to properly scale the component
        const nestedSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        nestedSvg.setAttribute('x', '0');
        nestedSvg.setAttribute('y', '0');
        nestedSvg.setAttribute('width', instance.componentDef.width * Canvas.state.gridSize);
        nestedSvg.setAttribute('height', instance.componentDef.height * Canvas.state.gridSize);
        nestedSvg.setAttribute('viewBox', viewBox);
        nestedSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        nestedSvg.innerHTML = instance.componentDef.svg;

        componentBody.appendChild(nestedSvg);
        group.appendChild(componentBody);

        // Add endpoints
        this.renderEndpoints(group, instance);

        // Add label if exists
        if (instance.label) {
            this.renderLabel(group, instance);
        }

        // Make clickable for selection
        group.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectComponent(instance.id, e.shiftKey);
        });

        // Right-click for context menu
        group.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.selectComponent(instance.id, false);
            this.showContextMenu(instance, e.clientX, e.clientY);
        });

        // Make draggable
        group.addEventListener('mousedown', (e) => {
            if (e.button === 0 && !e.shiftKey) {
                this.startDragComponent(instance, e);
            }
        });

        // Add to canvas
        componentsLayer.appendChild(group);

        // Store reference
        instance._svgElement = group;

        console.log('Component rendered to DOM:', instance.id, 'element:', group);
    },

    renderEndpoints(parentGroup, instance) {
        const endpointsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        endpointsGroup.classList.add('component-endpoints');

        instance.componentDef.endpoints.forEach(endpoint => {
            const worldPos = Canvas.gridToWorld(endpoint.x, endpoint.y);

            // Create invisible clickable area for endpoint (no visible dot)
            const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            hitArea.classList.add('component-endpoint');
            hitArea.setAttribute('cx', worldPos.x);
            hitArea.setAttribute('cy', worldPos.y);
            hitArea.setAttribute('r', '8'); // Larger for easier clicking
            hitArea.setAttribute('fill', 'transparent');
            hitArea.setAttribute('stroke', 'none');
            hitArea.style.cursor = 'crosshair';
            hitArea.dataset.endpointId = endpoint.id;

            // Click handler for wiring
            hitArea.addEventListener('click', (e) => {
                e.stopPropagation();
                WireRouter.handleEndpointClick(instance, endpoint, e);
            });

            // Hover effect - always show on hover (even during wiring for connection target)
            // Use fixed size with class toggle for smooth transitions
            hitArea.addEventListener('mouseenter', (e) => {
                if (!hitArea.classList.contains('active')) {
                    hitArea.classList.add('hover');
                    hitArea.setAttribute('r', '4');
                }
            });

            hitArea.addEventListener('mouseleave', (e) => {
                if (!hitArea.classList.contains('active')) {
                    hitArea.classList.remove('hover');
                    hitArea.setAttribute('r', '8');
                }
            });

            endpointsGroup.appendChild(hitArea);
        });

        parentGroup.appendChild(endpointsGroup);
    },

    renderLabel(parentGroup, instance) {
        if (!instance.label) return;

        const centerX = instance.componentDef.width * Canvas.state.gridSize / 2;
        const centerY = instance.componentDef.height * Canvas.state.gridSize / 2;

        // Background rectangle
        const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        labelBg.classList.add('component-label-bg');
        labelBg.setAttribute('x', centerX - 20);
        labelBg.setAttribute('y', centerY - 25);
        labelBg.setAttribute('width', 40);
        labelBg.setAttribute('height', 16);
        labelBg.setAttribute('rx', 2);

        // Text
        const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        labelText.classList.add('component-label');
        labelText.setAttribute('x', centerX);
        labelText.setAttribute('y', centerY - 14);
        labelText.setAttribute('text-anchor', 'middle');
        labelText.textContent = instance.label;

        parentGroup.appendChild(labelBg);
        parentGroup.appendChild(labelText);
    },

    startDragComponent(instance, e) {
        e.stopPropagation();
        DragDrop.startCanvasDrag(instance, e);
    },

    selectComponent(instanceId, multiSelect = false) {
        console.log('Selecting component:', instanceId, 'multiSelect:', multiSelect);

        if (!multiSelect) {
            this.clearSelection();
        }

        if (!this.state.selectedItems.includes(instanceId)) {
            this.state.selectedItems.push(instanceId);
        }

        console.log('Selected items:', this.state.selectedItems);
        this.updateSelectionVisuals();
    },

    clearSelection() {
        this.state.selectedItems = [];
        this.updateSelectionVisuals();
        WireRouter.clearWireSelection();
    },

    updateSelectionVisuals() {
        // Remove all selection boxes and styles
        document.querySelectorAll('.component-instance.selected').forEach(el => {
            el.classList.remove('selected');
        });
        document.querySelectorAll('.selection-box').forEach(el => el.remove());

        console.log('Updating selection visuals for:', this.state.selectedItems);
        console.log('Total components in DOM:', document.querySelectorAll('.component-instance').length);

        // Add selection to selected items
        this.state.selectedItems.forEach(id => {
            const instance = this.state.components.find(c => c.id === id);
            const element = document.querySelector(`[data-instance-id="${id}"]`);

            console.log('Selection visual update:', id);
            console.log('  - Instance found:', !!instance);
            console.log('  - Element found:', !!element);
            if (element) {
                console.log('  - Element dataset:', element.dataset);
            }

            if (element && instance) {
                console.log('  - Adding selection!');
                element.classList.add('selected');
                this.addSelectionBox(element, instance);
            } else {
                console.warn('  - Cannot add selection - missing element or instance');
            }
        });
    },

    addSelectionBox(element, instance) {
        const selectionLayer = document.getElementById('selection-layer');

        // Create selection box
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.classList.add('selection-box');

        const worldPos = Canvas.gridToWorld(instance.gridX, instance.gridY);
        const padding = 3; // Padding around component

        rect.setAttribute('x', worldPos.x - padding);
        rect.setAttribute('y', worldPos.y - padding);
        rect.setAttribute('width', instance.componentDef.width * Canvas.state.gridSize + padding * 2);
        rect.setAttribute('height', instance.componentDef.height * Canvas.state.gridSize + padding * 2);
        rect.setAttribute('rx', '4');

        selectionLayer.appendChild(rect);
    },

    showContextMenu(instance, clientX, clientY) {
        // Remove any existing context menu
        this.hideContextMenu();

        // Create context menu
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.id = 'component-context-menu';

        menu.innerHTML = `
            <div class="context-menu-item" data-action="rotate">
                <svg width="16" height="16" viewBox="0 0 16 16" style="margin-right: 8px;">
                    <path d="M8 2 A6 6 0 0 1 14 8" stroke="currentColor" stroke-width="2" fill="none"/>
                    <path d="M14 8 L11 6 L11 10 Z" fill="currentColor"/>
                </svg>
                Rotate (R)
            </div>
            <div class="context-menu-item" data-action="flip">
                <svg width="16" height="16" viewBox="0 0 16 16" style="margin-right: 8px;">
                    <path d="M4 4 L12 4 L12 12 L4 12 Z" stroke="currentColor" stroke-width="2" fill="none"/>
                    <path d="M8 2 L8 14" stroke="currentColor" stroke-width="1" stroke-dasharray="2,2"/>
                </svg>
                Flip (F)
            </div>
            <div class="context-menu-item" data-action="label">
                <svg width="16" height="16" viewBox="0 0 16 16" style="margin-right: 8px;">
                    <text x="3" y="12" font-size="10" fill="currentColor">Ab</text>
                </svg>
                Edit Label (L)
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="duplicate">
                <svg width="16" height="16" viewBox="0 0 16 16" style="margin-right: 8px;">
                    <rect x="2" y="2" width="8" height="8" stroke="currentColor" stroke-width="1.5" fill="none"/>
                    <rect x="6" y="6" width="8" height="8" stroke="currentColor" stroke-width="1.5" fill="none"/>
                </svg>
                Duplicate
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item danger" data-action="delete">
                <svg width="16" height="16" viewBox="0 0 16 16" style="margin-right: 8px;">
                    <path d="M3 4 L13 4 M5 4 L5 2 L11 2 L11 4 M4 6 L4 14 L12 14 L12 6" stroke="currentColor" stroke-width="1.5" fill="none"/>
                </svg>
                Delete (Del)
            </div>
        `;

        // Position menu
        menu.style.left = clientX + 'px';
        menu.style.top = clientY + 'px';

        document.body.appendChild(menu);

        // Add click handlers
        menu.querySelectorAll('.context-menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                this.handleContextMenuAction(action, instance);
                this.hideContextMenu();
            });
        });

        // Close menu on outside click
        setTimeout(() => {
            document.addEventListener('click', this.hideContextMenu.bind(this), { once: true });
        }, 100);
    },

    hideContextMenu() {
        const menu = document.getElementById('component-context-menu');
        if (menu) {
            menu.remove();
        }
    },

    handleContextMenuAction(action, instance) {
        switch (action) {
            case 'rotate':
                instance.rotation = (instance.rotation + 90) % 360;
                this.updateComponentTransform(instance);
                App.setStatus('Rotated component', 'info');
                break;

            case 'flip':
                instance.flipX = !instance.flipX;
                this.updateComponentTransform(instance);
                App.setStatus('Flipped component', 'info');
                break;

            case 'label':
                const newLabel = prompt('Enter component label:', instance.label || '');
                if (newLabel !== null) {
                    instance.label = newLabel;
                    this.updateComponentLabel(instance);
                    App.setStatus('Label updated', 'success');
                }
                break;

            case 'duplicate':
                const duplicate = {
                    ...instance,
                    id: `comp-${this.state.nextInstanceId++}`,
                    gridX: instance.gridX + 2,
                    gridY: instance.gridY + 2,
                    label: instance.label ? instance.label + ' (copy)' : ''
                };
                this.state.components.push(duplicate);
                this.renderComponentInstance(duplicate);
                App.setStatus('Component duplicated', 'success');
                break;

            case 'delete':
                this.state.selectedItems = [instance.id];
                this.deleteSelected();
                break;
        }
    },

    updateComponentLabel(instance) {
        if (!instance._svgElement) return;

        // Remove old label elements
        instance._svgElement.querySelectorAll('.component-label, .component-label-bg').forEach(el => el.remove());

        // Add new label if exists
        if (instance.label) {
            this.renderLabel(instance._svgElement, instance);
        }
    },

    deleteSelected() {
        if (this.state.selectedItems.length === 0) return;

        const count = this.state.selectedItems.length;

        // Remove from DOM
        this.state.selectedItems.forEach(id => {
            const element = document.querySelector(`[data-instance-id="${id}"]`);
            if (element) {
                element.remove();
            }

            // Remove from state
            this.state.components = this.state.components.filter(c => c.id !== id);
        });

        this.clearSelection();
        App.setStatus(`Deleted ${count} component${count > 1 ? 's' : ''}`, 'info');
    },

    rotateSelected() {
        if (this.state.selectedItems.length === 0) return;

        this.state.selectedItems.forEach(id => {
            const instance = this.state.components.find(c => c.id === id);
            if (instance) {
                instance.rotation = (instance.rotation + 90) % 360;
                this.updateComponentTransform(instance);
            }
        });

        App.setStatus('Rotated component(s)', 'info');
    },

    flipSelected() {
        if (this.state.selectedItems.length === 0) return;

        this.state.selectedItems.forEach(id => {
            const instance = this.state.components.find(c => c.id === id);
            if (instance) {
                instance.flipX = !instance.flipX;
                this.updateComponentTransform(instance);
            }
        });

        App.setStatus('Flipped component(s)', 'info');
    },

    labelSelected() {
        if (this.state.selectedItems.length === 0) {
            App.setStatus('No component selected', 'warning');
            return;
        }

        // Edit label for first selected component
        const instance = this.state.components.find(c => c.id === this.state.selectedItems[0]);
        if (instance) {
            const newLabel = prompt('Enter component label:', instance.label || '');
            if (newLabel !== null) {
                instance.label = newLabel;
                this.updateComponentLabel(instance);
                App.setStatus('Label updated', 'success');
            }
        }
    },

    updateComponentTransform(instance) {
        if (!instance._svgElement) return;

        const worldPos = Canvas.gridToWorld(instance.gridX, instance.gridY);
        let transform = `translate(${worldPos.x}, ${worldPos.y})`;

        if (instance.rotation !== 0) {
            const centerX = instance.componentDef.width * Canvas.state.gridSize / 2;
            const centerY = instance.componentDef.height * Canvas.state.gridSize / 2;
            transform += ` rotate(${instance.rotation}, ${centerX}, ${centerY})`;
        }

        if (instance.flipX || instance.flipY) {
            const scaleX = instance.flipX ? -1 : 1;
            const scaleY = instance.flipY ? -1 : 1;
            const centerX = instance.componentDef.width * Canvas.state.gridSize / 2;
            const centerY = instance.componentDef.height * Canvas.state.gridSize / 2;
            transform += ` translate(${centerX}, ${centerY}) scale(${scaleX}, ${scaleY}) translate(${-centerX}, ${-centerY})`;
        }

        instance._svgElement.setAttribute('transform', transform);
    },

    getComponentInstance(instanceId) {
        return this.state.components.find(c => c.id === instanceId);
    },

    getAllComponents() {
        return this.state.components;
    },

    extractComponentViewBox(svgString) {
        // Try to find viewBox in comment (from our conversion script)
        const commentMatch = svgString.match(/<!--\s*viewBox:\s*([^-]+)\s*-->/);
        if (commentMatch) {
            return commentMatch[1].trim();
        }

        // Try to find viewBox attribute
        const viewBoxMatch = svgString.match(/viewBox=["']([^"']+)["']/);
        if (viewBoxMatch) {
            return viewBoxMatch[1];
        }

        // Try to extract width/height
        const widthMatch = svgString.match(/width=["'](\d+(?:\.\d+)?)[^"']*["']/);
        const heightMatch = svgString.match(/height=["'](\d+(?:\.\d+)?)[^"']*["']/);

        if (widthMatch && heightMatch) {
            return `0 0 ${widthMatch[1]} ${heightMatch[1]}`;
        }

        // Absolute fallback
        return '0 0 100 100';
    },

    selectComponentsInBox(bounds) {
        console.log('selectComponentsInBox called with bounds:', bounds);
        console.log('Current components:', this.state.components.length);

        this.clearSelection();

        this.state.components.forEach(comp => {
            const worldPos = Canvas.gridToWorld(comp.gridX, comp.gridY);
            // Component width/height are already in pixels, not grid units
            const compWidth = comp.componentDef.width;
            const compHeight = comp.componentDef.height;

            console.log('Checking component:', comp.id, 'at', worldPos, 'size:', compWidth, 'x', compHeight);

            // Check if component overlaps with selection box
            if (worldPos.x < bounds.x + bounds.width &&
                worldPos.x + compWidth > bounds.x &&
                worldPos.y < bounds.y + bounds.height &&
                worldPos.y + compHeight > bounds.y) {
                console.log('Component', comp.id, 'is in selection box');
                this.state.selectedItems.push(comp.id);
            }
        });

        this.updateSelectionVisuals();

        console.log('Selected items:', this.state.selectedItems);

        if (this.state.selectedItems.length > 0) {
            App.setStatus(`Selected ${this.state.selectedItems.length} component${this.state.selectedItems.length > 1 ? 's' : ''}`, 'success');
        }
    },

    updateSelectionBox(start, current, element) {
        // Helper for drag selection (called during mouse move)
    },

    clear() {
        this.state.components = [];
        this.state.wires = [];
        this.clearSelection();

        document.getElementById('components-layer').innerHTML = '';
        document.getElementById('wires-layer').innerHTML = '';

        App.setStatus('Schematic cleared', 'info');
    }
};
