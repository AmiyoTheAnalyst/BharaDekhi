import os
import re

file_path = os.path.abspath('assets/crossroads-3d.js')
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Verify markers
start_marker = '    // Canopy Hood\n    const canopyCenterX = -7.5;'
end_marker = '    group.add(femaleGroup);\n\n    return group;\n  }'

if start_marker not in content:
    print('ERROR: start_marker not found in assets/crossroads-3d.js')
    exit(1)

if end_marker not in content:
    print('ERROR: end_marker not found in assets/crossroads-3d.js')
    exit(1)

print('Markers verified successfully!')
