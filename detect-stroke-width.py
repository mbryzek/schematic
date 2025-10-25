#!/usr/bin/env python3
"""
Detect actual stroke widths in SVG files and normalize grid sizes accordingly
This ensures all components have the same visual line thickness
"""

import json
import re
from pathlib import Path
from collections import Counter

def extract_stroke_widths(svg_content):
    """Extract all stroke-width values from SVG"""
    pattern = r'stroke-width=["\'"]?(\d+(?:\.\d+)?)["\']?'
    matches = re.findall(pattern, svg_content)
    return [float(m) for m in matches]

def get_dominant_stroke_width(svg_content):
    """Get the most common stroke width in the SVG"""
    widths = extract_stroke_widths(svg_content)
    if not widths:
        return 10.0  # Default

    # Return most common width
    counter = Counter(widths)
    return counter.most_common(1)[0][0]

def get_viewbox_dimensions(svg_content):
    """Extract viewBox width and height"""
    comment_match = re.search(r'<!--\s*viewBox:\s*([\d\s.]+)\s*-->', svg_content)
    if comment_match:
        parts = comment_match.group(1).strip().split()
        if len(parts) >= 4:
            return float(parts[2]), float(parts[3])

    viewbox_match = re.search(r'viewBox=["\']([\d\s.]+)["\']', svg_content)
    if viewbox_match:
        parts = viewbox_match.group(1).strip().split()
        if len(parts) >= 4:
            return float(parts[2]), float(parts[3])

    return None, None

def calculate_normalized_grid_size(viewbox_width, viewbox_height, svg_stroke_width, target_visual_stroke=3):
    """
    Calculate grid size so visual stroke width is consistent across all components

    Formula: visual_stroke = svg_stroke * (grid_pixels / viewbox_dimension)
             grid_pixels = grid_size * 10
    Therefore: visual_stroke = svg_stroke * (grid_size * 10 / viewbox_dimension)
    Solving: grid_size = (target_visual_stroke * viewbox_dimension) / (svg_stroke * 10)
    """

    if not viewbox_width or not viewbox_height or svg_stroke_width == 0:
        return None, None

    grid_width = (target_visual_stroke * viewbox_width) / (svg_stroke_width * 10)
    grid_height = (target_visual_stroke * viewbox_height) / (svg_stroke_width * 10)

    # Round to 0.5 increments
    grid_width = round(grid_width * 2) / 2
    grid_height = round(grid_height * 2) / 2

    # Minimum sizes
    grid_width = max(1.5, grid_width)
    grid_height = max(1.5, grid_height)

    return grid_width, grid_height

def update_component(json_path, target_stroke=3):
    """Update component with normalized grid size"""
    with open(json_path, 'r') as f:
        component = json.load(f)

    # Get viewBox and stroke width
    vb_width, vb_height = get_viewbox_dimensions(component['svg'])
    svg_stroke = get_dominant_stroke_width(component['svg'])

    if not vb_width:
        print(f"⚠ {json_path.name}: No viewBox found")
        return

    # Calculate normalized grid size
    new_width, new_height = calculate_normalized_grid_size(vb_width, vb_height, svg_stroke, target_stroke)

    if not new_width:
        print(f"⚠ {json_path.name}: Calculation failed")
        return

    old_width = component['width']
    old_height = component['height']

    # Update grid size
    component['width'] = new_width
    component['height'] = new_height

    # Update endpoint positions proportionally
    for endpoint in component['endpoints']:
        endpoint['x'] = (endpoint['x'] / old_width) * new_width
        endpoint['y'] = (endpoint['y'] / old_height) * new_height

    # Write back
    with open(json_path, 'w') as f:
        json.dump(component, f, indent=2)

    # Calculate what the visual stroke will be
    actual_stroke = svg_stroke * (new_width * 10 / vb_width)

    print(f"✓ {component['name']:20} SVG stroke: {svg_stroke:4.0f}  ViewBox: {int(vb_width):3}×{int(vb_height):3}  Grid: {old_width:4.1f}×{old_height:4.1f} → {new_width:4.1f}×{new_height:4.1f}  Visual: {actual_stroke:.1f}px")

def main():
    components_dir = Path(__file__).parent / 'components'
    json_files = list(components_dir.glob('*.json'))

    target_stroke = 3  # Target visual stroke width in pixels

    print(f'Auto-detecting stroke widths and normalizing {len(json_files)} components')
    print(f'Target visual stroke width: {target_stroke}px\n')

    for json_path in sorted(json_files):
        update_component(json_path, target_stroke)

    print(f'\n✓ All components normalized to {target_stroke}px visual stroke width!')

if __name__ == '__main__':
    main()
