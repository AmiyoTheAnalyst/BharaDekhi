import subprocess
import os
import shutil

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

with open('scratch/test_refined.html', 'r', encoding='utf-8') as f:
    base_html = f.read()

# 1. Rickshaw 3/4 Front View
html_rick1 = base_html.replace('camera.position.set(22, 14, 4);', 'camera.position.set(16, 11, -3);')
html_rick1 = html_rick1.replace('camera.lookAt(0, 8, -14);', 'camera.lookAt(0, 8, -14);')
with open('scratch/view_rick_front.html', 'w', encoding='utf-8') as f:
    f.write(html_rick1)

out_rick1 = os.path.abspath('scratch/rickshaw_front_34.png')
url_rick1 = os.path.abspath('scratch/view_rick_front.html').replace('\\', '/')
cmd_rick1 = [
    chrome_path, '--headless=new', '--no-sandbox', '--allow-file-access-from-files',
    '--enable-webgl', '--use-gl=angle', '--window-size=1280,720', '--virtual-time-budget=3000',
    f'--screenshot={out_rick1}', f'file:///{url_rick1}'
]
subprocess.run(cmd_rick1, timeout=15)

# 2. Rickshaw Passenger & Puller Side Profile View
html_rick2 = base_html.replace('camera.position.set(22, 14, 4);', 'camera.position.set(3, 10, 8);')
html_rick2 = html_rick2.replace('camera.lookAt(0, 8, -14);', 'camera.lookAt(-2, 8, -14);')
with open('scratch/view_rick_side.html', 'w', encoding='utf-8') as f:
    f.write(html_rick2)

out_rick2 = os.path.abspath('scratch/rickshaw_passengers_side.png')
url_rick2 = os.path.abspath('scratch/view_rick_side.html').replace('\\', '/')
cmd_rick2 = [
    chrome_path, '--headless=new', '--no-sandbox', '--allow-file-access-from-files',
    '--enable-webgl', '--use-gl=angle', '--window-size=1280,720', '--virtual-time-budget=3000',
    f'--screenshot={out_rick2}', f'file:///{url_rick2}'
]
subprocess.run(cmd_rick2, timeout=15)

# 3. CNG Front 3/4 View
html_cng1 = base_html.replace('camera.position.set(22, 14, 4);', 'camera.position.set(25, 12, 26);')
html_cng1 = html_cng1.replace('camera.lookAt(0, 8, -14);', 'camera.lookAt(0, 8, 14);')
with open('scratch/view_cng_front.html', 'w', encoding='utf-8') as f:
    f.write(html_cng1)

out_cng1 = os.path.abspath('scratch/cng_front_34.png')
url_cng1 = os.path.abspath('scratch/view_cng_front.html').replace('\\', '/')
cmd_cng1 = [
    chrome_path, '--headless=new', '--no-sandbox', '--allow-file-access-from-files',
    '--enable-webgl', '--use-gl=angle', '--window-size=1280,720', '--virtual-time-budget=3000',
    f'--screenshot={out_cng1}', f'file:///{url_cng1}'
]
subprocess.run(cmd_cng1, timeout=15)

# 4. CNG Rear 3/4 View showing cage doors and rear engine Alpona
html_cng2 = base_html.replace('camera.position.set(22, 14, 4);', 'camera.position.set(-22, 13, 26);')
html_cng2 = html_cng2.replace('camera.lookAt(0, 8, -14);', 'camera.lookAt(-4, 8, 14);')
with open('scratch/view_cng_rear.html', 'w', encoding='utf-8') as f:
    f.write(html_cng2)

out_cng2 = os.path.abspath('scratch/cng_rear_cage.png')
url_cng2 = os.path.abspath('scratch/view_cng_rear.html').replace('\\', '/')
cmd_cng2 = [
    chrome_path, '--headless=new', '--no-sandbox', '--allow-file-access-from-files',
    '--enable-webgl', '--use-gl=angle', '--window-size=1280,720', '--virtual-time-budget=3000',
    f'--screenshot={out_cng2}', f'file:///{url_cng2}'
]
subprocess.run(cmd_cng2, timeout=15)

dest_dir = r'C:\Users\HP\.gemini\antigravity\brain\a2d3aea8-cfe9-491c-9b42-9d7a3c2c4ed8'
shutil.copy(out_rick1, os.path.join(dest_dir, 'rickshaw_front_34.png'))
shutil.copy(out_rick2, os.path.join(dest_dir, 'rickshaw_passengers_side.png'))
shutil.copy(out_cng1, os.path.join(dest_dir, 'cng_front_34.png'))
shutil.copy(out_cng2, os.path.join(dest_dir, 'cng_rear_cage.png'))

print('Captured all 4 views!')
