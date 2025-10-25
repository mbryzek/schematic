// Export Module
// Handles exporting schematic as PNG

const ExportPNG = {
    init() {
        const exportBtn = document.getElementById('export-png');
        exportBtn?.addEventListener('click', () => this.exportToPNG());
    },

    async exportToPNG() {
        try {
            const svg = document.getElementById('canvas');
            const content = document.getElementById('canvas-content');

            if (!svg || !content) {
                throw new Error('Canvas elements not found');
            }

            // Get bounding box of all content
            const bbox = this.getContentBounds();

            if (!bbox) {
                alert('Nothing to export. Add some components first!');
                return;
            }

            // Create canvas
            const canvas = document.createElement('canvas');
            const padding = 40;
            const scale = 2; // Higher resolution

            canvas.width = (bbox.width + padding * 2) * scale;
            canvas.height = (bbox.height + padding * 2) * scale;

            const ctx = canvas.getContext('2d');

            // Set background
            const theme = Theme.getCurrentTheme();
            ctx.fillStyle = theme === 'dark' ? '#1a1a1a' : '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Scale and translate
            ctx.scale(scale, scale);
            ctx.translate(padding - bbox.x, padding - bbox.y);

            // Convert SVG to image and draw
            await this.drawSVGToCanvas(svg, ctx, bbox);

            // Download
            this.downloadCanvas(canvas, 'schematic.png');

            console.log('Exported PNG successfully');
        } catch (error) {
            console.error('Error exporting PNG:', error);
            alert('Failed to export PNG. Check console for details.');
        }
    },

    getContentBounds() {
        const componentsLayer = document.getElementById('components-layer');
        const wiresLayer = document.getElementById('wires-layer');

        if (!componentsLayer && !wiresLayer) return null;

        try {
            let minX = Infinity, minY = Infinity;
            let maxX = -Infinity, maxY = -Infinity;

            // Check components
            const components = componentsLayer?.querySelectorAll('.component-instance');
            components?.forEach(comp => {
                const bbox = comp.getBBox();
                minX = Math.min(minX, bbox.x);
                minY = Math.min(minY, bbox.y);
                maxX = Math.max(maxX, bbox.x + bbox.width);
                maxY = Math.max(maxY, bbox.y + bbox.height);
            });

            // Check wires
            const wires = wiresLayer?.querySelectorAll('.wire');
            wires?.forEach(wire => {
                const bbox = wire.getBBox();
                minX = Math.min(minX, bbox.x);
                minY = Math.min(minY, bbox.y);
                maxX = Math.max(maxX, bbox.x + bbox.width);
                maxY = Math.max(maxY, bbox.y + bbox.height);
            });

            if (!isFinite(minX)) return null;

            return {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
            };
        } catch (error) {
            console.error('Error calculating bounds:', error);
            return null;
        }
    },

    async drawSVGToCanvas(svg, ctx, bbox) {
        // Clone SVG and prepare for export
        const svgClone = svg.cloneNode(true);

        // Remove grid background
        const grid = svgClone.querySelector('#grid-background');
        if (grid) grid.remove();

        // Set viewBox to content bounds
        svgClone.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
        svgClone.setAttribute('width', bbox.width);
        svgClone.setAttribute('height', bbox.height);

        // Serialize SVG to string
        const svgString = new XMLSerializer().serializeToString(svgClone);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        // Load as image
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, bbox.x, bbox.y, bbox.width, bbox.height);
                URL.revokeObjectURL(url);
                resolve();
            };
            img.onerror = reject;
            img.src = url;
        });
    },

    downloadCanvas(canvas, filename) {
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }
};
