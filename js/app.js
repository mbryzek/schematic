// Main Application Controller
// Initializes all modules and manages global state

const App = {
    init() {
        console.log('Circuit Schematic Builder initializing...');

        // Initialize modules in order
        Theme.init();
        Canvas.init();
        ComponentManager.init();
        SchematicManager.init();
        DragDrop.init();
        WireRouter.init();
        ExportPNG.init();

        // Load any saved schematic
        this.loadCurrentSchematic();

        // Set up global keyboard shortcuts
        this.setupGlobalShortcuts();

        // Ready!
        this.setStatus('Ready to build circuits! Drag components onto the canvas.');
        console.log('Application initialized successfully');
    },

    setupGlobalShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Skip if typing in input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            switch (e.key.toLowerCase()) {
                case 's':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.saveSchematic();
                    }
                    break;

                case 'delete':
                case 'backspace':
                    // TODO: Delete selected items
                    break;

                case 'escape':
                    // Cancel any active operations
                    WireRouter.cancelWire();
                    break;

                case 'z':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        // TODO: Undo
                    }
                    break;

                case 'y':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        // TODO: Redo
                    }
                    break;
            }
        });
    },

    loadCurrentSchematic() {
        const schematic = Storage.getCurrentSchematic();
        if (schematic) {
            console.log('Loading saved schematic:', schematic.name || schematic.id);
            // TODO: Restore components and wires from schematic data
        }
    },

    saveSchematic() {
        const schematic = {
            name: prompt('Enter schematic name:', 'My Circuit') || 'Untitled',
            components: [],  // TODO: Get from schematic manager
            wires: []        // TODO: Get from wire router
        };

        const id = Storage.saveSchematic(schematic);
        if (id) {
            this.setStatus(`Schematic saved: ${schematic.name}`);
        } else {
            this.setStatus('Failed to save schematic', 'error');
        }
    },

    setStatus(message, type = 'info') {
        const statusEl = document.getElementById('status-message');
        if (statusEl) {
            statusEl.textContent = message;

            // Color coding based on type
            statusEl.style.color = type === 'error' ? 'var(--danger)' :
                                  type === 'success' ? 'var(--success)' :
                                  'var(--text-secondary)';
        }

        console.log(`[${type.toUpperCase()}]`, message);
    }
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}
