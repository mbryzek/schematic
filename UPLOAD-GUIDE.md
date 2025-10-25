# Component Upload Guide

The Circuit Schematic Builder supports uploading custom components in two formats: **JSON** and **SVG**.

## Upload Button

The upload button in the component panel now:
- ✅ Centers text and icon for better visual alignment
- ✅ Highlights on hover with color change
- ✅ Accepts both `.json` and `.svg` files

## JSON Upload (.json)

Upload a complete component definition with full control over all properties.

### JSON Format
```json
{
  "id": "unique-component-id",
  "name": "Component Name",
  "category": "passive|active|power|user",
  "description": "Optional description",
  "svg": "<svg path data>",
  "width": 4,
  "height": 2,
  "endpoints": [
    {
      "id": "endpoint-id",
      "x": 0,
      "y": 1,
      "direction": "left|right|up|down"
    }
  ]
}
```

### Required Fields
- `id`: Unique identifier (string)
- `name`: Display name (string)
- `svg`: SVG markup without `<svg>` wrapper (string)
- `width`: Component width in grid units (number)
- `height`: Component height in grid units (number)
- `endpoints`: Array of connection points (array)

### Example JSON Component
See `test-component.json` in the project root for a complete example.

### How to Upload JSON
1. Click the **Upload** button in the component panel
2. Select a `.json` file
3. If validation passes, component is added to the "User" category
4. If component ID exists, you'll be prompted to replace it

---

## SVG Upload (.svg)

Upload raw SVG files and the app will automatically convert them to components.

### How SVG Upload Works
1. **Upload**: Click **Upload** and select an `.svg` file
2. **Auto-extract**: The app extracts SVG content (removes `<svg>` wrapper)
3. **Configure**: You'll be prompted for:
   - **Component name**: Display name (default: filename with spaces, e.g., "My Component")
   - **Component ID**: Unique identifier (default: lowercase filename, e.g., "my-component")
   - **Component width**: Grid units (default: 4)
   - **Component height**: Grid units (default: 2)
4. **Auto-generate**: The app creates:
   - Component with your custom name and ID
   - Default endpoints (left and right at vertical center)
   - Saved to "User" category

### SVG Requirements
- Must be valid SVG format
- Use `currentColor` for strokes/fills to support theme switching
- Center the artwork around (0, 0) for best results
- Keep viewBox reasonable (e.g., `-40 -40 80 80`)

### Example SVG Component
See `test-component.svg` in the project root - an IC chip with pins.

### Customizing SVG Components

**During Upload:**
- Edit the suggested name (e.g., "IC Chip" instead of "Test Component")
- Modify the ID if needed (must be unique)
- Adjust width/height to match your SVG proportions

**After Upload:**
SVG components get these defaults:
- **Endpoints**: Left and right at vertical center
- **Category**: `user`

To customize endpoints or add more connection points, you'll need to:
1. Export the component (coming in Phase 7)
2. Edit the JSON to add/modify endpoints
3. Re-upload as JSON

---

## Tips for Creating Components

### SVG Best Practices
1. **Use relative coordinates** centered around (0, 0)
2. **Use `currentColor`** for stroke/fill to inherit theme colors
3. **Keep lines visible** with stroke-width of at least 2
4. **Add clear connection points** where wires should attach

### Grid Units
- 1 grid unit = 10 pixels by default
- Common component sizes:
  - 2-terminal (resistor): 6×2 units
  - 3-terminal (transistor): 6×6 units
  - IC chips: 8×10 units or larger

### Testing Components
1. Upload your component
2. Click the "User" category filter
3. Try dragging it onto the canvas (Phase 3, coming soon!)
4. If it doesn't look right, adjust and re-upload

---

## Upload Features

### Duplicate Detection
- If a component with the same ID exists, you'll be prompted
- Choose "OK" to replace the existing component
- Choose "Cancel" to keep the existing version

### Validation
- **JSON**: Validates all required fields before accepting
- **SVG**: Checks for valid SVG format
- Clear error messages if validation fails

### Storage
- Components saved to browser localStorage
- Persists across sessions
- Appears in "User" category
- Can be exported (Phase 7)

### File Input Reset
- File input clears after each upload
- Allows uploading the same file multiple times
- Useful for testing iterative changes

---

## Examples Included

### test-component.json
Complete JSON component definition with:
- Rounded rectangle design
- Left and right connection points
- Proper grid sizing

### test-component.svg
IC chip component with:
- Rectangular body with rounded corners
- 5 pins on each side
- Center circle indicator
- Orientation notch at top

---

## Troubleshooting

### "Invalid component file format"
- **Cause**: Missing required fields in JSON
- **Fix**: Ensure all required fields are present (id, name, svg, width, height, endpoints)

### "Error reading SVG file"
- **Cause**: Invalid SVG syntax
- **Fix**: Validate SVG in an editor or viewer first

### "Failed to save component"
- **Cause**: localStorage quota exceeded
- **Fix**: Delete some components or clear browser data

### SVG doesn't display correctly
- **Cause**: ViewBox or coordinates may be off-center
- **Fix**: Adjust SVG to center around (0, 0) and use appropriate viewBox

### Component looks wrong in panel
- **Cause**: SVG size doesn't match specified width/height
- **Fix**: Adjust the width/height parameters to match SVG aspect ratio

---

## Coming Soon

Future enhancements for component uploads:
- [ ] Visual endpoint editor
- [ ] Drag-and-drop upload
- [ ] Component preview before upload
- [ ] Batch upload multiple components
- [ ] Export all user components as ZIP
- [ ] Share components via URL
