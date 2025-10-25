// Electrical Rules Module
// Defines electrical conventions for components and auto-endpoint detection

const ElectricalRules = {
    // Component electrical properties
    componentRules: {
        // Polarized components (have input/output direction)
        'diode': {
            type: 'polarized',
            input: 'anode',
            output: 'cathode',
            direction: 'unidirectional'
        },
        'led': {
            type: 'polarized',
            input: 'anode',
            output: 'cathode',
            direction: 'unidirectional'
        },
        'npn-transistor': {
            type: 'active',
            inputs: ['base'],
            outputs: ['collector', 'emitter'],
            powerFlow: 'collector-to-emitter'
        },
        'phototransistor': {
            type: 'active',
            inputs: ['base'],
            outputs: ['collector', 'emitter'],
            powerFlow: 'collector-to-emitter'
        },
        'op-amp-1': {
            type: 'active',
            inputs: ['in+', 'in-'],
            outputs: ['out'],
            direction: 'unidirectional'
        },
        'op-amp-2': {
            type: 'active',
            inputs: ['in+', 'in-'],
            outputs: ['out'],
            direction: 'unidirectional'
        },

        // Non-polarized components (symmetric)
        'resistor': {
            type: 'passive',
            symmetric: true
        },
        'capacitor': {
            type: 'passive',
            symmetric: true
        },
        'impedance': {
            type: 'passive',
            symmetric: true
        },

        // Power/Ground
        'ground': {
            type: 'reference',
            isGround: true,
            endpoint: 'top'
        },
        'vcc': {
            type: 'power',
            isPower: true,
            endpoint: 'bottom'
        },
        'probe': {
            type: 'test',
            endpoint: 'connection'
        }
    },

    // Suggest which endpoint to use based on context
    suggestEndpoint(componentInstance, context = {}) {
        const componentId = componentInstance.componentDef.id;
        const rules = this.componentRules[componentId];

        if (!rules) {
            // Unknown component, use first endpoint
            return componentInstance.componentDef.endpoints[0]?.id || null;
        }

        // For symmetric components, choose based on position
        if (rules.symmetric) {
            return this.suggestSymmetricEndpoint(componentInstance, context);
        }

        // For polarized components, prefer input if starting, output if completing
        if (rules.type === 'polarized') {
            if (context.isStarting) {
                return rules.input;
            } else {
                return rules.output;
            }
        }

        // For active components with multiple pins
        if (rules.type === 'active') {
            if (context.isStarting) {
                // Prefer output pins when starting
                return rules.outputs?.[0] || componentInstance.componentDef.endpoints[0]?.id;
            } else {
                // Prefer input pins when completing
                return rules.inputs?.[0] || componentInstance.componentDef.endpoints[0]?.id;
            }
        }

        // For power/ground/reference
        if (rules.type === 'reference' || rules.type === 'power' || rules.type === 'test') {
            return rules.endpoint;
        }

        // Default to first endpoint
        return componentInstance.componentDef.endpoints[0]?.id || null;
    },

    suggestSymmetricEndpoint(componentInstance, context) {
        // For symmetric components (resistor, capacitor), choose based on position
        const endpoints = componentInstance.componentDef.endpoints;

        if (endpoints.length < 2) {
            return endpoints[0]?.id;
        }

        // If we have context about where the wire is coming from
        if (context.fromPosition) {
            // Choose the endpoint closest to the source
            let closestEndpoint = endpoints[0];
            let minDistance = Infinity;

            endpoints.forEach(ep => {
                const epWorld = WireRouter.getEndpointWorldPosition(componentInstance, ep);
                const distance = Math.sqrt(
                    Math.pow(epWorld.x - context.fromPosition.x, 2) +
                    Math.pow(epWorld.y - context.fromPosition.y, 2)
                );

                if (distance < minDistance) {
                    minDistance = distance;
                    closestEndpoint = ep;
                }
            });

            return closestEndpoint.id;
        }

        // Default to first endpoint
        return endpoints[0].id;
    },

    // Get suggested connection message
    getConnectionHint(startComponent, endComponent) {
        const startRules = this.componentRules[startComponent.componentDef.id];
        const endRules = this.componentRules[endComponent.componentDef.id];

        // Check for common mistakes
        if (startRules?.isGround && endRules?.isGround) {
            return { valid: false, message: 'Warning: Connecting ground to ground' };
        }

        if (startRules?.isPower && endRules?.isPower) {
            return { valid: false, message: 'Warning: Connecting power to power directly' };
        }

        // Check polarity
        if (startRules?.type === 'polarized' && endRules?.type === 'polarized') {
            // Both polarized - check if connected correctly
            // This is a simplified check
            return { valid: true, message: 'Check polarity: anode to cathode' };
        }

        return { valid: true, message: null };
    }
};
