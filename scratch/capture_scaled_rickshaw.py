import subprocess
import os

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

# 1. Side profile view
out_side = os.path.abspath('scratch/scaled_rickshaw_side.png')
url_side = os.path.abspath('scratch/test_scaled_rickshaw.html').replace('\\', '/')
cmd_side = [
    chrome_path, '--headless=new', '--no-sandbox', '--allow-file-access-from-files',
    '--enable-webgl', '--use-gl=angle', '--window-size=1280,720', '--virtual-time-budget=3000',
    f'--screenshot={out_side}', f'file:///{url_side}'
]
print("Capturing side view...")
subprocess.run(cmd_side, timeout=15)
print("Side captured:", os.path.exists(out_side), os.path.getsize(out_side) if os.path.exists(out_side) else 0)

# 2. 3/4 Front View
with open('scratch/test_scaled_rickshaw.html', 'r', encoding='utf-8') as f:
    base_html = f.read()

html_front = base_html.replace('camera.position.set(0, 11, -36);', 'camera.position.set(24, 14, -20);')
html_front = html_front.replace('camera.lookAt(0, 9, 0);', 'camera.lookAt(-2, 9, 0);')

with open('scratch/view_scaled_rick_front.html', 'w', encoding='utf-8') as f:
    f.write(html_front)

out_front = os.path.abspath('scratch/scaled_rickshaw_front_34.png')
url_front = os.path.abspath('scratch/view_scaled_rick_front.html').replace('\\', '/')
cmd_front = [
    chrome_path, '--headless=new', '--no-sandbox', '--allow-file-access-from-files',
    '--enable-webgl', '--use-gl=angle', '--window-size=1280,720', '--virtual-time-budget=3000',
    f'--screenshot={out_front}', f'file:///{url_front}'
]
print("Capturing front 3/4 view...")
subprocess.run(cmd_front, timeout=15)
print("Front captured:", os.path.exists(out_front), os.path.getsize(out_front) if os.path.exists(out_front) else 0)
