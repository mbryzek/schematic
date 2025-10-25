#!/usr/bin/env python3
"""
Normalize component grid sizes so all stroke-widths appear consistent
"""

import json
import re
from pathlib import Path

def get_viewbox_dimensions(svg_content):
    """Extract viewBox width and height from SVG"""
    # Look for viewBox in comment
    comment_match = re.search(r'<!--\s*viewBox:\s*([\d\s.]+)\s*-->', svg_content)
    if comment_match:
        parts = comment_match.group(1).strip().split()
        if len(parts) >= 4:
            return float(parts[2]), float(parts[3])  # width, height

    # Look for viewBox attribute
    viewbox_match = re.search(r'viewBox=["\']([\d\s.]+)["\']', svg_content)
    if viewbox_match:
        parts = viewbox_match.group(1).strip().split()
        if len(parts) >= 4:
            return float(parts[2]), float(parts[3])

    return None, None

def calculate_optimal_grid_size(viewbox_width, viewbox_height, target_stroke_px=3, svg_stroke_width=10):
    """
    Calculate grid size so that stroke-width appears consistent

    Formula: visual_stroke = svg_stroke * (grid_size * 10 / viewbox_dimension)
    Solving for grid_size: grid_size = (target_stroke * viewbox_dimension) / (svg_stroke * 10)
    """

    if not viewbox_width or not viewbox_height:
        return None, None

    # Calculate based on width (primary dimension for most components)
    grid_width = (target_stroke_px * viewbox_width) / (svg_stroke_width * 10)
    grid_height = (target_stroke_px * viewbox_height) / (svg_stroke_width * 10)

    # Round to reasonable values (0.5 increments)
    grid_width = round(grid_width * 2) / 2
    grid_height = round(grid_height * 2) / 2

    # Ensure minimum size
    grid_width = max(2, grid_width)
    grid_height = max(1.5, grid_height)

    return grid_width, grid_height

def update_component_json(json_path):
    """Update component JSON with normalized grid sizes"""
    with open(json_path, 'r') as f:
        component = json.load(f)

    # Get viewBox dimensions
    vb_width, vb_height = get_viewbox_dimensions(component['svg'])

    if not vb_width:
        print(f"⚠ {json_path.name}: Could not extract viewBox, skipping")
        return

    # Calculate optimal grid size
    new_width, new_height = calculate_optimal_grid_size(vb_width, vb_height)

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

    print(f"✓ {component['name']:20} ViewBox: {int(vb_width)}×{int(vb_height):3}  Grid: {old_width}×{old_height} → {new_width}×{new_height}")

def main():
    components_dir = Path(__file__).parent / 'components'
    json_files = list(components_dir.glob('*.json'))

    print(f'Normalizing stroke widths for {len(json_files)} components\n')
    print(f'{"Component":<20} {"ViewBox":<15} {"Grid Size Change"}')
    print('-' * 60)

    for json_path in sorted(json_files):
        update_component_json(json_path)

    print('\n✓ All components normalized!')
    print('\nTarget: All components will have consistent 3px stroke width when rendered')

if __name__ == '__main__':
    main()
