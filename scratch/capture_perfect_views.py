import subprocess
import os
import shutil

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

with open('scratch/test_perfect.html', 'r', encoding='utf-8') as f:
    base_html = f.read()

# 1. Rickshaw Side Profile (Full length, Puller pedaling & Seated Passengers)
html_rick1 = base_html.replace('camera.position.set(0, 10, 48);', 'camera.position.set(0, 11, 14);')
html_rick1 = html_rick1.replace('camera.lookAt(0, 8, 0);', 'camera.lookAt(0, 9, -20);')
with open('scratch/view_perfect_rick_side.html', 'w', encoding='utf-8') as f:
    f.write(html_rick1)

out_rick1 = os.path.abspath('scratch/perfect_rickshaw_side.png')
url_rick1 = os.path.abspath('scratch/view_perfect_rick_side.html').replace('\\', '/')
cmd_rick1 = [
    chrome_path, '--headless=new', '--no-sandbox', '--allow-file-access-from-files',
    '--enable-webgl', '--use-gl=angle', '--window-size=1280,720', '--virtual-time-budget=3000',
    f'--screenshot={out_rick1}', f'file:///{url_rick1}'
]
subprocess.run(cmd_rick1, timeout=15)

# 2. Rickshaw 3/4 Front View (Hood art, spoked wheels, handlebars, passengers)
html_rick2 = base_html.replace('camera.position.set(0, 10, 48);', 'camera.position.set(28, 14, -8);')
html_rick2 = html_rick2.replace('camera.lookAt(0, 8, 0);', 'camera.lookAt(-2, 8.5, -20);')
with open('scratch/view_perfect_rick_front.html', 'w', encoding='utf-8') as f:
    f.write(html_rick2)

out_rick2 = os.path.abspath('scratch/perfect_rickshaw_front.png')
url_rick2 = os.path.abspath('scratch/view_perfect_rick_front.html').replace('\\', '/')
cmd_rick2 = [
    chrome_path, '--headless=new', '--no-sandbox', '--allow-file-access-from-files',
    '--enable-webgl', '--use-gl=angle', '--window-size=1280,720', '--virtual-time-budget=3000',
    f'--screenshot={out_rick2}', f'file:///{url_rick2}'
]
subprocess.run(cmd_rick2, timeout=15)

# 3. CNG Side Profile (Picture 4 Match: Full length, Doors, Livery, Wheels)
html_cng1 = base_html.replace('camera.position.set(0, 10, 48);', 'camera.position.set(0, 11, 56);')
html_cng1 = html_cng1.replace('camera.lookAt(0, 8, 0);', 'camera.lookAt(0, 9, 20);')
with open('scratch/view_perfect_cng_side.html', 'w', encoding='utf-8') as f:
    f.write(html_cng1)

out_cng1 = os.path.abspath('scratch/perfect_cng_side.png')
url_cng1 = os.path.abspath('scratch/view_perfect_cng_side.html').replace('\\', '/')
cmd_cng1 = [
    chrome_path, '--headless=new', '--no-sandbox', '--allow-file-access-from-files',
    '--enable-webgl', '--use-gl=angle', '--window-size=1280,720', '--virtual-time-budget=3000',
    f'--screenshot={out_cng1}', f'file:///{url_cng1}'
]
subprocess.run(cmd_cng1, timeout=15)

# 4. CNG 3/4 Front View (Nose, Windshield, Headlight, Grill cage)
html_cng2 = base_html.replace('camera.position.set(0, 10, 48);', 'camera.position.set(30, 14, 44);')
html_cng2 = html_cng2.replace('camera.lookAt(0, 8, 0);', 'camera.lookAt(0, 8.5, 20);')
with open('scratch/view_perfect_cng_front.html', 'w', encoding='utf-8') as f:
    f.write(html_cng2)

out_cng2 = os.path.abspath('scratch/perfect_cng_front.png')
url_cng2 = os.path.abspath('scratch/view_perfect_cng_front.html').replace('\\', '/')
cmd_cng2 = [
    chrome_path, '--headless=new', '--no-sandbox', '--allow-file-access-from-files',
    '--enable-webgl', '--use-gl=angle', '--window-size=1280,720', '--virtual-time-budget=3000',
    f'--screenshot={out_cng2}', f'file:///{url_cng2}'
]
subprocess.run(cmd_cng2, timeout=15)

# 5. CNG Rear View (Alpona + License plate)
html_cng3 = base_html.replace('camera.position.set(0, 10, 48);', 'camera.position.set(-36, 12, 20);')
html_cng3 = html_cng3.replace('camera.lookAt(0, 8, 0);', 'camera.lookAt(-4, 9, 20);')
with open('scratch/view_perfect_cng_rear.html', 'w', encoding='utf-8') as f:
    f.write(html_cng3)

out_cng3 = os.path.abspath('scratch/perfect_cng_rear.png')
url_cng3 = os.path.abspath('scratch/view_perfect_cng_rear.html').replace('\\', '/')
cmd_cng3 = [
    chrome_path, '--headless=new', '--no-sandbox', '--allow-file-access-from-files',
    '--enable-webgl', '--use-gl=angle', '--window-size=1280,720', '--virtual-time-budget=3000',
    f'--screenshot={out_cng3}', f'file:///{url_cng3}'
]
subprocess.run(cmd_cng3, timeout=15)

dest_dir = r'C:\Users\HP\.gemini\antigravity\brain\a2d3aea8-cfe9-491c-9b42-9d7a3c2c4ed8'
for f in ['perfect_rickshaw_side.png', 'perfect_rickshaw_front.png', 'perfect_cng_side.png', 'perfect_cng_front.png', 'perfect_cng_rear.png']:
    src = os.path.join('scratch', f)
    if os.path.exists(src):
        shutil.copy(src, os.path.join(dest_dir, f))

print('Captured all updated views!')
