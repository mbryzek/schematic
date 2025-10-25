# Circuit Schematic Builder

A web-based circuit schematic editor that allows you to create, edit, and export circuit diagrams.

## Features

- **Interactive Grid Canvas**: Zoom and pan with mouse wheel and drag
- **Component Library**: Search and browse circuit components
- **Drag & Drop**: Intuitive component placement with grid snapping
- **Wire Routing**: Multiple routing modes:
  - Manual waypoint placement
  - Automatic Manhattan routing
  - 45° diagonal wiring (Shift key)
- **Component Management**: Upload custom components
- **PNG Export**: Download schematics as high-quality images
- **Light/Dark Mode**: Toggle between themes
- **Local Storage**: Auto-save your work

## Getting Started

**IMPORTANT**: This application needs to run on a local web server (not just by opening index.html) because browsers block loading JSON files from the file system.

### Option 1: Quick Start (Recommended)
```bash
cd ~/code/schematic
./start-server.sh
```
Then open your browser to: http://localhost:8000

### Option 2: Manual Start
```bash
cd ~/code/schematic

# Python 3
python3 -m http.server 8000

# OR Python 2
python -m SimpleHTTPServer 8000

# OR Node.js
npx http-server -p 8000
```

### Using the Application
1. Browse components in the right panel
2. Search or filter by category (Passive, Active, Power)
3. Drag components onto the grid (Phase 3 - coming soon)
4. Click component endpoints to draw wires (Phase 4 - coming soon)
5. Export your schematic as PNG when done

## Component Format

Components are defined as JSON files with the following structure:

```json
{
  "id": "unique-component-id",
  "name": "Component Name",
  "category": "passive|active|power|user",
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

### Creating Custom Components

1. Create a JSON file following the format above
2. Click "Upload" in the component panel
3. Select your JSON file
4. Your component will appear in the "User" category

## Keyboard Shortcuts

- `+` / `-` : Zoom in/out
- `0` : Reset view
- `Shift + Drag` : Pan canvas
- `Alt/Option` : Hold for free-angle wiring (allows diagonal wires)
- `Escape` : Cancel wire drawing
- `Delete` : Delete selected item
- `Ctrl/Cmd + S` : Save schematic
- `R` : Rotate selected component
- `F` : Flip selected component
- `L` : Edit label for selected component

## Browser Requirements

- Modern web browser with ES6+ support
- localStorage enabled
- Minimum screen resolution: 1024x768

## Development Status

### Phase 1: ✅ Core Infrastructure (Complete)
- Project structure
- Grid canvas with zoom/pan
- Theme switching
- localStorage utilities

### Phase 2: 🚧 Component System (In Progress)
- Component loading and display
- Search and filtering
- Basic drag and drop

### Phase 3-7: 📋 Planned
- Full drag & drop with snapping
- Wire routing system
- User component uploads
- PNG export
- Advanced features and polish

## Technical Stack

- **Frontend**: Vanilla JavaScript (ES6+)
- **Rendering**: SVG
- **Storage**: localStorage
- **Styling**: CSS3 with custom properties

## Project Structure

```
schematic/
├── index.html              # Main entry point
├── css/                    # Stylesheets
│   ├── main.css
│   ├── theme.css
│   ├── components.css
│   └── canvas.css
├── js/                     # JavaScript modules
│   ├── app.js
│   ├── canvas.js
│   ├── component-manager.js
│   ├── drag-drop.js
│   ├── wire-router.js
│   ├── storage.js
│   ├── theme.js
│   └── export.js
├── components/             # Built-in components
└── usercomponents/         # User-uploaded components
```

## License

MIT License - Feel free to use and modify as needed.

## Future Enhancements

- Undo/redo functionality
- Component rotation and flipping
- Copy/paste components
- Schematic templates
- Export to SVG
- Print functionality
- Multi-sheet schematics
- Component properties editor
- Netlist export
- Collaboration features
