# -*- coding: utf-8 -*-
with open("scratch/build_master_bike.py", "r", encoding="utf-8") as f:
    text = f.read()

# Fix plateFrame geometry (BoxGeometry width along local X, height along Y, depth along Z)
text = text.replace(
    "new THREE.BoxGeometry(0.08, 0.95, 1.55)",
    "new THREE.BoxGeometry(1.55, 0.95, 0.08)"
)

# Fix plate texture resolution & crisp font
old_tex_needle = "ctx.fillText('UF82 ISK', 64, 34);"
if old_tex_needle in text:
    old_canvas_block = """    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(0, 0, 128, 64);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, 122, 58);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('UF82 ISK', 64, 34);"""

    new_canvas_block = """    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 248, 120);
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 36px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('UF82 ISK', 128, 66);"""

    text = text.replace(old_canvas_block, new_canvas_block)
    print("Replaced license plate canvas block with 256x128 crisp texture.")

with open("scratch/build_master_bike.py", "w", encoding="utf-8") as f:
    f.write(text)

print("SUCCESS: Updated build_master_bike.py")
