# Troubleshooting Guide

## Components Not Showing Up

### Problem
The component panel shows "No components found" or is empty.

### Cause
Opening `index.html` directly (via `file://` protocol) causes browsers to block loading JSON files for security reasons.

### Solution
**Run a local web server** instead:

```bash
cd ~/code/schematic
./start-server.sh
```

Then access via: http://localhost:8000

### Why This Happens
Modern browsers implement CORS (Cross-Origin Resource Security) which blocks:
- Loading local files via `fetch()` from `file://` URLs
- This is a security feature to prevent malicious websites from reading your local files

### Alternative Solutions

**Option 1: Python 3**
```bash
cd ~/code/schematic
python3 -m http.server 8000
```

**Option 2: Python 2**
```bash
cd ~/code/schematic
python -m SimpleHTTPServer 8000
```

**Option 3: Node.js**
```bash
cd ~/code/schematic
npx http-server -p 8000
```

**Option 4: VS Code Live Server**
If using VS Code:
1. Install "Live Server" extension
2. Right-click `index.html`
3. Select "Open with Live Server"

---

## SVG Upload Not Working

### Problem
Uploading an SVG file shows "invalid" or fails silently.

### Diagnosis Steps

1. **Check Browser Console** (F12 or Cmd+Option+I)
   - Look for validation errors
   - Should show which fields failed validation

2. **Verify SVG Format**
   - Must be valid SVG XML
   - Should have `<svg>` wrapper (will be auto-extracted)
   - Test by opening SVG in a browser or viewer first

3. **Check Prompts**
   - Width and height must be positive numbers
   - Don't cancel the prompts (will abort upload)

### Common SVG Upload Issues

**Issue: "Width and height must be positive numbers"**
- Cause: Entered non-numeric value or negative number
- Fix: Enter valid positive numbers like `4` or `6.5`

**Issue: Upload cancelled message**
- Cause: Clicked Cancel on width/height prompt
- Fix: Click Upload again and complete the prompts

**Issue: Component not appearing**
- Cause: May be in wrong category or search is active
- Fix: Click "All" category and clear search box

### Debug Info
Open console and check for:
```
Component validation failed: {
  hasId: true/false,
  hasName: true/false,
  hasSvg: true/false,
  widthType: "number"/"string",
  heightType: "number"/"string",
  hasEndpoints: true/false,
  endpointsLength: number
}
```

---

## No Components After Refresh

### Problem
Components were there, now they're gone after refresh.

### Likely Causes

1. **Server Not Running**
   - Components load from JSON files
   - Need local server running (see above)

2. **localStorage Cleared**
   - User components stored in browser
   - Clearing browser data removes them

3. **Different Port/URL**
   - localStorage is per-origin
   - http://localhost:8000 vs file:// are different origins
   - Use consistent URL

### Solution
- Always use the same URL (e.g., http://localhost:8000)
- Keep server running while developing
- Export your custom components before clearing browser data

---

## JSON Upload Fails

### Problem
Uploading JSON component shows validation error.

### Check Your JSON

Required fields:
```json
{
  "id": "string",           // Required
  "name": "string",         // Required
  "category": "string",     // Optional (defaults to "user")
  "svg": "string",          // Required (SVG markup without <svg> wrapper)
  "width": number,          // Required (positive number)
  "height": number,         // Required (positive number)
  "endpoints": [            // Required (array with at least 1 item)
    {
      "id": "string",
      "x": number,
      "y": number,
      "direction": "left|right|up|down"
    }
  ]
}
```

### Common JSON Errors

**"Invalid component file format"**
- Missing required field
- Check console for validation details

**"Failed to save component"**
- localStorage quota exceeded (5MB typical)
- Clear some components or browser data

**"Component already exists"**
- Duplicate ID
- Choose to replace or cancel and change ID

---

## Drag and Drop Not Working

### Status
Drag and drop is partially implemented (Phase 3).

### Current Behavior
- Can drag from component panel
- Ghost appears
- Can drop on canvas
- Component appears but not fully functional yet

### Coming Soon (Phase 3)
- Grid snapping
- Component selection
- Component dragging on canvas
- Delete components

---

## localStorage Issues

### Check Usage
Open browser console:
```javascript
Storage.checkQuota()
```

Shows current usage and percentage.

### Clear Storage
```javascript
Storage.clearAll()
```

**WARNING**: This deletes all saved data including:
- User components
- Schematics
- Preferences

### Export Before Clearing
```javascript
const backup = Storage.exportData()
console.log(JSON.stringify(backup, null, 2))
```

Copy and save this JSON to restore later.

---

## Theme Not Switching

### Problem
Theme toggle button doesn't work.

### Checks
1. Button has click handler (should have)
2. Console shows errors (check F12)
3. Try manually:
   ```javascript
   Theme.setTheme('dark')
   Theme.setTheme('light')
   ```

### Fix
Refresh page - theme preference saved in localStorage.

---

## Zoom/Pan Not Working

### Problem
Mouse wheel or drag doesn't work.

### Common Causes
1. **Focus Issue**: Click on canvas first
2. **Browser Extension**: Some extensions block events
3. **Shift Key**: Need Shift+Drag to pan

### Test
Open console:
```javascript
Canvas.zoom(1.5)  // Zoom in
Canvas.zoom(0.5)  // Zoom out
Canvas.resetView()
```

---

## Getting Help

### Information to Provide

1. **Browser & Version**
   - Chrome 120, Firefox 119, Safari 17, etc.

2. **URL Used**
   - file:// vs http://localhost:8000

3. **Console Errors**
   - Press F12 or Cmd+Option+I
   - Check Console tab
   - Copy any red error messages

4. **Steps to Reproduce**
   - What you did
   - What you expected
   - What actually happened

### Check Browser Console
Most issues show error messages in the console.

Press F12 (Windows/Linux) or Cmd+Option+I (Mac) to open developer tools.

---

## Known Limitations

### Current Phase: Phase 2 (Components)
- ✅ Component loading
- ✅ Search and filter
- ✅ Upload JSON/SVG
- 🚧 Drag and drop (partial)
- ❌ Wire routing (Phase 4)
- ❌ PNG export (Phase 6)
- ❌ Full features (Phase 7)

### Browser Support
- ✅ Chrome 90+
- ✅ Safari 14+
- 🚧 Firefox (needs testing)
- 🚧 Edge (needs testing)
- ❌ IE11 (not supported)

### Platform
- ✅ macOS
- ✅ Windows (needs local server)
- ✅ Linux (needs local server)
- ❌ Mobile (Phase 7)
