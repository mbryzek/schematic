#!/usr/bin/env python3
"""
Convert SVG files to component JSON format
"""

import json
import os
import re
from pathlib import Path

# Component metadata (manually configured for each)
COMPONENT_METADATA = {
    'resistor': {'width': 6, 'height': 2, 'category': 'passive'},
    'diode': {'width': 4, 'height': 3, 'category': 'active'},
    'led': {'width': 4, 'height': 3, 'category': 'active'},
    'ground': {'width': 3, 'height': 2, 'category': 'power'},
    'impedance': {'width': 4, 'height': 2, 'category': 'passive'},
    'npn-transistor': {'width': 5, 'height': 5, 'category': 'active'},
    'op-amp-1': {'width': 5, 'height': 4, 'category': 'active'},
    'op-amp-2': {'width': 5, 'height': 4, 'category': 'active'},
    'phototransistor': {'width': 5, 'height': 5, 'category': 'active'},
    'probe': {'width': 2, 'height': 3, 'category': 'passive'},
}

def clean_filename_to_id(filename):
    """Convert filename to component ID"""
    # Remove .svg extension
    name = filename.replace('.svg', '')
    # Convert to lowercase and replace spaces/special chars with dashes
    name = re.sub(r'[^a-z0-9]+', '-', name.lower())
    # Remove leading/trailing dashes
    return name.strip('-')

def clean_filename_to_name(filename):
    """Convert filename to display name"""
    return filename.replace('.svg', '').strip()

def extract_svg_content(svg_path):
    """Extract inner SVG content and preserve viewBox"""
    with open(svg_path, 'r') as f:
        content = f.read()

    # Remove XML declaration
    content = re.sub(r'<\?xml[^>]*\?>', '', content)

    # Extract SVG tag attributes (viewBox, width, height)
    svg_tag_match = re.search(r'<svg([^>]*)>', content)
    svg_attributes = ''
    if svg_tag_match:
        svg_attributes = svg_tag_match.group(1)

    # Extract everything between <svg> tags
    match = re.search(r'<svg[^>]*>(.*)</svg>', content, re.DOTALL)
    inner_content = match.group(1).strip() if match else content

    # If there's a viewBox in the original SVG, preserve it in a wrapper
    viewbox_match = re.search(r'viewBox=["\']([\d\s.-]+)["\']', svg_attributes)
    if viewbox_match:
        viewbox = viewbox_match.group(1)
        # Wrap content in a group with viewBox info as comment
        inner_content = f'<!-- viewBox: {viewbox} -->\n    {inner_content}'

    return inner_content

def convert_svg_to_json(svg_path, output_dir):
    """Convert a single SVG file to JSON component"""
    filename = os.path.basename(svg_path)
    component_id = clean_filename_to_id(filename)
    component_name = clean_filename_to_name(filename)

    # Get metadata or use defaults
    metadata = COMPONENT_METADATA.get(component_id, {
        'width': 4,
        'height': 3,
        'category': 'passive'
    })

    # Extract SVG content
    svg_content = extract_svg_content(svg_path)

    # Determine endpoints based on category
    if metadata['category'] == 'power' and component_id == 'ground':
        endpoints = [{'id': 'top', 'x': metadata['width'] / 2, 'y': 0, 'direction': 'up'}]
    else:
        # Default: left and right endpoints
        endpoints = [
            {'id': 'left', 'x': 0, 'y': metadata['height'] / 2, 'direction': 'left'},
            {'id': 'right', 'x': metadata['width'], 'y': metadata['height'] / 2, 'direction': 'right'}
        ]

    # Create component object
    component = {
        'id': component_id,
        'name': component_name,
        'category': metadata['category'],
        'description': f'{component_name} component',
        'svg': svg_content,
        'width': metadata['width'],
        'height': metadata['height'],
        'endpoints': endpoints
    }

    # Write JSON file
    output_path = os.path.join(output_dir, f'{component_id}.json')
    with open(output_path, 'w') as f:
        json.dump(component, f, indent=2)

    print(f'✓ Converted {filename} -> {component_id}.json')
    return component_id

def main():
    components_dir = Path(__file__).parent / 'components'

    # Find all SVG files
    svg_files = list(components_dir.glob('*.svg'))

    if not svg_files:
        print('No SVG files found in components directory')
        return

    print(f'Found {len(svg_files)} SVG files to convert\n')

    converted_ids = []
    for svg_path in sorted(svg_files):
        try:
            component_id = convert_svg_to_json(svg_path, components_dir)
            converted_ids.append(component_id)
        except Exception as e:
            print(f'✗ Error converting {svg_path.name}: {e}')

    print(f'\n✓ Successfully converted {len(converted_ids)} components')
    print(f'\nComponent IDs: {", ".join(converted_ids)}')

    # Generate list for component-manager.js
    print('\nAdd to component-manager.js loadBuiltInComponents():')
    print('const componentFiles = [')
    for comp_id in sorted(converted_ids):
        print(f"    '{comp_id}',")
    print('];')

if __name__ == '__main__':
    main()
