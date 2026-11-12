import re
import os

with open('assets/crossroads-3d.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add cached getLungiTexture if not already present
if 'function getLungiTexture()' not in code:
    lungi_code = '''
  let sharedLungiTexture = null;
  function getLungiTexture() {
    if (sharedLungiTexture) return sharedLungiTexture;
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#264c9c';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#1a3675';
    ctx.lineWidth = 3;
    for (let y = 0; y < 256; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
    }
    for (let x = 0; x < 256; x += 32) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    for (let y = 8; y < 256; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
    }
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    for (let y = 14; y < 256; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 3);
    sharedLungiTexture = tex;
    return sharedLungiTexture;
  }
'''
    pos = code.find('let sharedRickshawArtTexture = null;')
    if pos != -1:
        code = code[:pos] + lungi_code + '\n' + code[pos:]
        print('Added getLungiTexture before sharedRickshawArtTexture')

# 2. Extract createRealisticDhakaRickshaw replacement from test_adult_rickshaw.html
with open('scratch/test_adult_rickshaw.html', 'r', encoding='utf-8') as f:
    test_html = f.read()

# Grab body of buildMasterRickshaw
start_marker = 'function buildMasterRickshaw() {'
end_marker = 'const rickshaw = buildMasterRickshaw();'
b_start = test_html.find(start_marker)
b_end = test_html.find(end_marker)
master_func_body = test_html[b_start + len(start_marker):b_end].strip()

# Adjust signature and inner variable name for crossroads-3d.js
# In crossroads-3d.js: function createRealisticDhakaRickshaw(colorHex, appearanceSeed, vData) { ... }
# Note: tubPalette and tubColor
rickshaw_func_str = '''  function createRealisticDhakaRickshaw(colorHex, appearanceSeed, vData) {
    ''' + master_func_body + '''
'''

# Find createRealisticDhakaRickshaw in crossroads-3d.js
f_start = code.find('function createRealisticDhakaRickshaw(colorHex, appearanceSeed, vData) {')
f_end = code.find('function createRealisticDhakaCNG(colorHex, appearanceSeed, vData) {')

if f_start != -1 and f_end != -1:
    code = code[:f_start] + rickshaw_func_str + '\n  ' + code[f_end:]
    print(f'Successfully replaced createRealisticDhakaRickshaw! (start: {f_start}, end: {f_end})')
    with open('assets/crossroads-3d.js', 'w', encoding='utf-8') as f:
        f.write(code)
    print('Saved assets/crossroads-3d.js')
else:
    print(f'Error locating markers: f_start={f_start}, f_end={f_end}')
