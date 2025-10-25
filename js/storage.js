// Storage Management Module
// Handles localStorage operations for components, schematics, and preferences

const Storage = {
    // Keys
    KEYS: {
        USER_COMPONENTS: 'schematic_user_components',
        SCHEMATICS: 'schematic_schematics',
        PREFERENCES: 'schematic_preferences',
        CURRENT_SCHEMATIC: 'schematic_current'
    },

    // Get preferences with defaults
    getPreferences() {
        const defaults = {
            theme: 'light',
            gridSize: 10,
            showGrid: true,
            autoSave: true
        };

        try {
            const stored = localStorage.getItem(this.KEYS.PREFERENCES);
            return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
        } catch (error) {
            console.error('Error loading preferences:', error);
            return defaults;
        }
    },

    // Save preferences
    savePreferences(preferences) {
        try {
            localStorage.setItem(this.KEYS.PREFERENCES, JSON.stringify(preferences));
            return true;
        } catch (error) {
            console.error('Error saving preferences:', error);
            this.checkQuota();
            return false;
        }
    },

    // Get user components
    getUserComponents() {
        try {
            const stored = localStorage.getItem(this.KEYS.USER_COMPONENTS);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading user components:', error);
            return [];
        }
    },

    // Save user components
    saveUserComponents(components) {
        try {
            localStorage.setItem(this.KEYS.USER_COMPONENTS, JSON.stringify(components));
            return true;
        } catch (error) {
            console.error('Error saving user components:', error);
            this.checkQuota();
            return false;
        }
    },

    // Add a user component
    addUserComponent(component) {
        const components = this.getUserComponents();

        // Check for duplicate ID
        if (components.find(c => c.id === component.id)) {
            const error = new Error(`Component with ID "${component.id}" already exists`);
            error.code = 'DUPLICATE_ID';
            throw error;
        }

        components.push(component);
        const result = this.saveUserComponents(components);

        if (!result) {
            const error = new Error('Failed to save to localStorage');
            error.code = 'STORAGE_FULL';
            throw error;
        }

        return result;
    },

    // Remove a user component
    removeUserComponent(componentId) {
        const components = this.getUserComponents();
        const filtered = components.filter(c => c.id !== componentId);
        return this.saveUserComponents(filtered);
    },

    // Get all schematics
    getSchematics() {
        try {
            const stored = localStorage.getItem(this.KEYS.SCHEMATICS);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Error loading schematics:', error);
            return {};
        }
    },

    // Save schematic
    saveSchematic(schematic) {
        try {
            const schematics = this.getSchematics();

            if (!schematic.id) {
                schematic.id = 'schematic-' + Date.now();
            }

            if (!schematic.created) {
                schematic.created = new Date().toISOString();
            }

            schematic.modified = new Date().toISOString();

            schematics[schematic.id] = schematic;
            localStorage.setItem(this.KEYS.SCHEMATICS, JSON.stringify(schematics));

            // Also save as current schematic
            this.setCurrentSchematic(schematic);

            return schematic.id;
        } catch (error) {
            console.error('Error saving schematic:', error);
            this.checkQuota();
            return null;
        }
    },

    // Get schematic by ID
    getSchematic(schematicId) {
        const schematics = this.getSchematics();
        return schematics[schematicId] || null;
    },

    // Delete schematic
    deleteSchematic(schematicId) {
        try {
            const schematics = this.getSchematics();
            delete schematics[schematicId];
            localStorage.setItem(this.KEYS.SCHEMATICS, JSON.stringify(schematics));
            return true;
        } catch (error) {
            console.error('Error deleting schematic:', error);
            return false;
        }
    },

    // Get current schematic
    getCurrentSchematic() {
        try {
            const stored = localStorage.getItem(this.KEYS.CURRENT_SCHEMATIC);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.error('Error loading current schematic:', error);
            return null;
        }
    },

    // Set current schematic
    setCurrentSchematic(schematic) {
        try {
            localStorage.setItem(this.KEYS.CURRENT_SCHEMATIC, JSON.stringify(schematic));
            return true;
        } catch (error) {
            console.error('Error saving current schematic:', error);
            return false;
        }
    },

    // Clear current schematic
    clearCurrentSchematic() {
        try {
            localStorage.removeItem(this.KEYS.CURRENT_SCHEMATIC);
            return true;
        } catch (error) {
            console.error('Error clearing current schematic:', error);
            return false;
        }
    },

    // Export data as JSON
    exportData() {
        return {
            preferences: this.getPreferences(),
            userComponents: this.getUserComponents(),
            schematics: this.getSchematics(),
            exportDate: new Date().toISOString()
        };
    },

    // Import data from JSON
    importData(data) {
        try {
            if (data.preferences) {
                this.savePreferences(data.preferences);
            }
            if (data.userComponents) {
                this.saveUserComponents(data.userComponents);
            }
            if (data.schematics) {
                localStorage.setItem(this.KEYS.SCHEMATICS, JSON.stringify(data.schematics));
            }
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    },

    // Check localStorage quota
    checkQuota() {
        try {
            const total = new Blob(Object.values(localStorage)).size;
            const limit = 5 * 1024 * 1024; // 5MB typical limit
            const percentage = (total / limit) * 100;

            if (percentage > 80) {
                console.warn(`localStorage is ${percentage.toFixed(1)}% full`);
            }

            return { total, limit, percentage };
        } catch (error) {
            console.error('Error checking quota:', error);
            return null;
        }
    },

    // Clear all data
    clearAll() {
        try {
            Object.values(this.KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            return false;
        }
    }
};
