// Component Management Module
// Handles loading, searching, and rendering components in the panel

const ComponentManager = {
    // State
    components: [],
    filteredComponents: [],
    selectedCategory: 'all',
    searchQuery: '',

    init() {
        // Load built-in components
        this.loadBuiltInComponents();

        // Load user components from storage
        this.loadUserComponents();

        // Set up event listeners
        this.setupEventListeners();

        // Initial render
        this.renderComponentsList();
    },

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('component-search');
        searchInput?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.filterComponents();
        });

        // Category buttons
        const categoryBtns = document.querySelectorAll('.category-btn');
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                categoryBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedCategory = btn.dataset.category;
                this.filterComponents();
            });
        });

        // Upload button
        const uploadBtn = document.getElementById('upload-component');
        uploadBtn?.addEventListener('click', () => {
            document.getElementById('component-file-input')?.click();
        });

        // File input
        const fileInput = document.getElementById('component-file-input');
        fileInput?.addEventListener('change', (e) => {
            this.handleComponentUpload(e.target.files[0]);
        });
    },

    async loadBuiltInComponents() {
        // List of built-in component files to load
        const componentFiles = [
            'capacitor',
            'diode',
            'ground',
            'impedance',
            'led',
            'npn-transistor',
            'op-amp-1',
            'op-amp-2',
            'phototransistor',
            'probe',
            'resistor'
        ];

        // Show loading state
        const listContainer = document.getElementById('components-list');
        if (listContainer) {
            listContainer.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        }

        // Load each component file
        const loadPromises = componentFiles.map(async (fileName) => {
            try {
                const response = await fetch(`components/${fileName}.json`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                const component = await response.json();

                // Validate component
                if (this.validateComponent(component)) {
                    return component;
                } else {
                    console.warn(`Invalid component format: ${fileName}.json`);
                    return null;
                }
            } catch (error) {
                console.error(`Failed to load component ${fileName}.json:`, error);
                return null;
            }
        });

        // Wait for all components to load
        const loadedComponents = await Promise.all(loadPromises);

        // Filter out any failed loads and add to components array
        this.components = loadedComponents.filter(c => c !== null);

        console.log(`Loaded ${this.components.length} built-in components`);

        // Initial filter and render
        this.filterComponents();
    },

    loadUserComponents() {
        const userComponents = Storage.getUserComponents();
        userComponents.forEach(comp => {
            comp.category = 'user';
            this.components.push(comp);
        });
        this.filterComponents();
    },

    filterComponents() {
        this.filteredComponents = this.components.filter(comp => {
            // Category filter
            const categoryMatch = this.selectedCategory === 'all' || comp.category === this.selectedCategory;

            // Search filter
            const searchMatch = !this.searchQuery ||
                comp.name.toLowerCase().includes(this.searchQuery) ||
                comp.category.toLowerCase().includes(this.searchQuery);

            return categoryMatch && searchMatch;
        });

        this.renderComponentsList();
    },

    renderComponentsList() {
        const listContainer = document.getElementById('components-list');
        if (!listContainer) return;

        // Clear existing content
        listContainer.innerHTML = '';

        if (this.filteredComponents.length === 0) {
            listContainer.innerHTML = `
                <div class="components-list-empty">
                    <svg viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" stroke-width="2"/>
                        <path d="M32 20 L32 36 M32 44 L32 44" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                    </svg>
                    <p>No components found</p>
                </div>
            `;
            return;
        }

        // Render each component
        this.filteredComponents.forEach(comp => {
            const item = this.createComponentItem(comp);
            listContainer.appendChild(item);
        });
    },

    createComponentItem(component) {
        const item = document.createElement('div');
        item.className = 'component-item';
        item.dataset.componentId = component.id;
        item.draggable = true;

        // Calculate optimal viewBox for icon display
        const viewBox = this.calculateOptimalViewBox(component);

        item.innerHTML = `
            <div class="component-icon">
                <svg viewBox="${viewBox}" width="40" height="40" preserveAspectRatio="xMidYMid meet">
                    <g class="component-icon-content">
                        ${component.svg}
                    </g>
                </svg>
            </div>
            <div class="component-info">
                <div class="component-name">${component.name}</div>
                <div class="component-category">${component.category}</div>
            </div>
        `;

        // Store component data on element
        item.__componentData = component;

        return item;
    },

    calculateOptimalViewBox(component) {
        // Extract viewBox from SVG if it exists
        const extractedViewBox = this.extractViewBox(component.svg);
        if (extractedViewBox) {
            return extractedViewBox;
        }

        // Try to find bounding box by parsing SVG dimensions
        const bounds = this.estimateSVGBounds(component.svg);
        if (bounds) {
            // Add 10% padding around the content
            const padding = Math.max(bounds.width, bounds.height) * 0.1;
            return `${bounds.x - padding} ${bounds.y - padding} ${bounds.width + padding * 2} ${bounds.height + padding * 2}`;
        }

        // Final fallback: use component dimensions with generous scale
        const scale = 100; // pixels per grid unit
        return `0 0 ${component.width * scale} ${component.height * scale}`;
    },

    extractViewBox(svgString) {
        // Try to find viewBox in comment (from our conversion script)
        const commentMatch = svgString.match(/<!--\s*viewBox:\s*([^-]+)\s*-->/);
        if (commentMatch) {
            return commentMatch[1].trim();
        }

        // Try to find viewBox attribute in the SVG content
        const viewBoxMatch = svgString.match(/viewBox=["']([^"']+)["']/);
        if (viewBoxMatch) {
            return viewBoxMatch[1];
        }

        return null;
    },

    estimateSVGBounds(svgString) {
        // Try to extract width/height from SVG tag if present
        const widthMatch = svgString.match(/width=["'](\d+(?:\.\d+)?)[^"']*["']/);
        const heightMatch = svgString.match(/height=["'](\d+(?:\.\d+)?)[^"']*["']/);

        if (widthMatch && heightMatch) {
            const width = parseFloat(widthMatch[1]);
            const height = parseFloat(heightMatch[1]);
            return { x: 0, y: 0, width, height };
        }

        // Try to find transform translate to estimate offset
        const transformMatch = svgString.match(/transform=["']translate\(([^,]+),\s*([^)]+)\)["']/);
        if (transformMatch) {
            const tx = parseFloat(transformMatch[1]);
            const ty = parseFloat(transformMatch[2]);

            // Estimate bounds based on transform
            // This is rough but better than nothing
            return { x: -tx, y: -ty, width: tx * 4, height: ty * 4 };
        }

        return null;
    },

    handleComponentUpload(file) {
        if (!file) return;

        const fileExt = file.name.split('.').pop().toLowerCase();

        if (fileExt === 'svg') {
            // Handle SVG file upload
            this.handleSVGUpload(file);
        } else if (fileExt === 'json') {
            // Handle JSON file upload
            this.handleJSONUpload(file);
        } else {
            alert('Please upload a .json or .svg file');
        }
    },

    handleJSONUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const component = JSON.parse(e.target.result);

                // Validate component structure
                if (!this.validateComponent(component)) {
                    alert('Invalid component file format. Required fields: id, name, svg, width, height, endpoints');
                    return;
                }

                // Check for duplicate ID
                const existingComp = this.components.find(c => c.id === component.id);
                if (existingComp) {
                    const message = `A component with ID "${component.id}" already exists!\n\n` +
                        `Existing: "${existingComp.name}" (${existingComp.category})\n` +
                        `New: "${component.name}"\n\n` +
                        `Do you want to replace the existing component?`;

                    if (!confirm(message)) {
                        App.setStatus(`Upload cancelled - duplicate ID: ${component.id}`, 'warning');
                        const fileInput = document.getElementById('component-file-input');
                        if (fileInput) fileInput.value = '';
                        return;
                    }
                    // Remove old version
                    this.components = this.components.filter(c => c.id !== component.id);
                    Storage.removeUserComponent(component.id);
                }

                // Add to storage
                try {
                    Storage.addUserComponent(component);

                    // Add to components list
                    component.category = 'user';
                    this.components.push(component);
                    this.filterComponents();

                    App.setStatus(`Component "${component.name}" uploaded successfully!`, 'success');

                } catch (error) {
                    console.error('Storage error:', error);

                    let errorMsg = `Failed to save component "${component.name}"!\n\n`;

                    if (error.code === 'DUPLICATE_ID') {
                        errorMsg += `Error: ${error.message}\n\n` +
                            'This should have been caught earlier. Please report this bug.';
                    } else if (error.code === 'STORAGE_FULL') {
                        errorMsg += 'Error: localStorage is full\n\n' +
                            'Solutions:\n' +
                            '• Delete some user components\n' +
                            '• Clear browser data for this site\n' +
                            '• Export your components first to back them up';
                    } else {
                        errorMsg += `Error: ${error.message}\n\n` +
                            'Possible reasons:\n' +
                            '• localStorage is disabled in browser settings\n' +
                            '• Component data is too large\n' +
                            '• Browser storage quota exceeded\n\n' +
                            'Check browser console for more details.';
                    }

                    alert(errorMsg);
                    App.setStatus(`Upload failed: ${error.message}`, 'error');
                }
            } catch (error) {
                console.error('Error parsing component file:', error);
                alert('Error reading component file. Make sure it\'s valid JSON.');
            }

            // Clear file input so same file can be uploaded again
            const fileInput = document.getElementById('component-file-input');
            if (fileInput) fileInput.value = '';
        };

        reader.readAsText(file);
    },

    handleSVGUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const svgContent = e.target.result;

                // Extract SVG inner content (remove <svg> wrapper if present)
                let svgInner = svgContent;
                const svgMatch = svgContent.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
                if (svgMatch) {
                    svgInner = svgMatch[1].trim();
                }

                // Generate default values from filename
                const defaultId = file.name.replace('.svg', '').toLowerCase().replace(/[^a-z0-9-]/g, '-');
                const defaultName = file.name.replace('.svg', '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

                // Prompt for component details
                const componentName = prompt('Enter component name:', defaultName);
                if (!componentName || componentName.trim() === '') {
                    App.setStatus('Upload cancelled - name is required', 'info');
                    const fileInput = document.getElementById('component-file-input');
                    if (fileInput) fileInput.value = '';
                    return;
                }

                const componentId = prompt('Enter component ID (lowercase, no spaces):', defaultId);
                if (!componentId || componentId.trim() === '') {
                    App.setStatus('Upload cancelled - ID is required', 'info');
                    const fileInput = document.getElementById('component-file-input');
                    if (fileInput) fileInput.value = '';
                    return;
                }

                const width = prompt('Enter component width (grid units):', '4');
                const height = prompt('Enter component height (grid units):', '2');

                if (!width || !height || width === '' || height === '') {
                    App.setStatus('Upload cancelled', 'info');
                    const fileInput = document.getElementById('component-file-input');
                    if (fileInput) fileInput.value = '';
                    return;
                }

                // Validate numeric inputs
                const widthNum = parseFloat(width);
                const heightNum = parseFloat(height);

                if (isNaN(widthNum) || isNaN(heightNum) || widthNum <= 0 || heightNum <= 0) {
                    alert('Width and height must be positive numbers');
                    const fileInput = document.getElementById('component-file-input');
                    if (fileInput) fileInput.value = '';
                    return;
                }

                // Create basic component with default endpoints
                const component = {
                    id: componentId.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                    name: componentName.trim(),
                    category: 'user',
                    description: `Custom component from ${file.name}`,
                    svg: svgInner,
                    width: widthNum,
                    height: heightNum,
                    endpoints: [
                        {
                            id: 'left',
                            x: 0,
                            y: heightNum / 2,
                            direction: 'left'
                        },
                        {
                            id: 'right',
                            x: widthNum,
                            y: heightNum / 2,
                            direction: 'right'
                        }
                    ]
                };

                console.log('SVG component created:', component);

                // Check for duplicate ID
                if (this.components.find(c => c.id === component.id)) {
                    if (!confirm(`A component with ID "${component.id}" already exists. Replace it?`)) {
                        return;
                    }
                    // Remove old version
                    this.components = this.components.filter(c => c.id !== component.id);
                    Storage.removeUserComponent(component.id);
                }

                // Validate before saving
                if (!this.validateComponent(component)) {
                    // Get validation details from console
                    const validationIssues = [];
                    if (!component.id) validationIssues.push('Missing component ID');
                    if (!component.name) validationIssues.push('Missing component name');
                    if (!component.svg) validationIssues.push('Missing SVG content');
                    if (typeof component.width !== 'number') validationIssues.push(`Width is ${typeof component.width}, expected number`);
                    if (typeof component.height !== 'number') validationIssues.push(`Height is ${typeof component.height}, expected number`);
                    if (!Array.isArray(component.endpoints)) validationIssues.push('Endpoints is not an array');
                    if (component.endpoints && component.endpoints.length === 0) validationIssues.push('Component has no endpoints');

                    const errorMsg = 'Component validation failed!\n\n' +
                        'Issues found:\n' +
                        validationIssues.map(issue => `• ${issue}`).join('\n') +
                        '\n\nComponent data:\n' +
                        `ID: ${component.id || '(missing)'}\n` +
                        `Name: ${component.name || '(missing)'}\n` +
                        `Width: ${component.width} (${typeof component.width})\n` +
                        `Height: ${component.height} (${typeof component.height})\n` +
                        `Endpoints: ${component.endpoints?.length || 0} defined`;

                    alert(errorMsg);
                    console.error('Validation failed:', component, validationIssues);
                    App.setStatus('Upload failed - validation error', 'error');
                    const fileInput = document.getElementById('component-file-input');
                    if (fileInput) fileInput.value = '';
                    return;
                }

                // Add to storage
                try {
                    Storage.addUserComponent(component);

                    // Add to components list
                    this.components.push(component);
                    this.filterComponents();

                    App.setStatus(`SVG component "${component.name}" created successfully!`, 'success');
                    console.log('Created component:', component);

                } catch (error) {
                    console.error('Storage error:', error);

                    let errorMsg = `Failed to save component "${component.name}"!\n\n`;

                    if (error.code === 'DUPLICATE_ID') {
                        errorMsg += `Error: ${error.message}\n\n` +
                            'This should have been caught earlier. Please report this bug.';
                    } else if (error.code === 'STORAGE_FULL') {
                        errorMsg += 'Error: localStorage is full\n\n' +
                            'Solutions:\n' +
                            '• Delete some user components\n' +
                            '• Clear browser data for this site\n' +
                            '• Export your components first to back them up';
                    } else {
                        errorMsg += `Error: ${error.message}\n\n` +
                            'Possible reasons:\n' +
                            '• localStorage is disabled in browser settings\n' +
                            '• Component data is too large\n' +
                            '• Browser storage quota exceeded\n\n' +
                            'Check browser console for more details.';
                    }

                    alert(errorMsg);
                    App.setStatus(`Upload failed: ${error.message}`, 'error');
                }
            } catch (error) {
                console.error('Error processing SVG file:', error);
                alert('Error reading SVG file. Make sure it\'s a valid SVG.');
            }

            // Clear file input so same file can be uploaded again
            const fileInput = document.getElementById('component-file-input');
            if (fileInput) fileInput.value = '';
        };

        reader.readAsText(file);
    },

    validateComponent(component) {
        const isValid = (
            component.id &&
            component.name &&
            component.svg &&
            typeof component.width === 'number' &&
            typeof component.height === 'number' &&
            Array.isArray(component.endpoints) &&
            component.endpoints.length > 0
        );

        if (!isValid) {
            console.warn('Component validation failed:', {
                hasId: !!component.id,
                hasName: !!component.name,
                hasSvg: !!component.svg,
                widthType: typeof component.width,
                heightType: typeof component.height,
                hasEndpoints: Array.isArray(component.endpoints),
                endpointsLength: component.endpoints?.length
            });
        }

        return isValid;
    },

    getComponentById(id) {
        return this.components.find(c => c.id === id);
    }
};
