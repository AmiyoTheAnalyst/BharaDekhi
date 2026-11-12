import subprocess
import os

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

with open('scratch/test_refined_passengers.html', 'r', encoding='utf-8') as f:
    base_html = f.read()

# 1. Side view
out_side = os.path.abspath('scratch/refined_rick_side.png')
url_side = os.path.abspath('scratch/test_refined_passengers.html').replace('\\', '/')
cmd_side = [
    chrome_path, '--headless=new', '--no-sandbox', '--allow-file-access-from-files',
    '--enable-webgl', '--use-gl=angle', '--window-size=1280,720', '--virtual-time-budget=3000',
    f'--screenshot={out_side}', f'file:///{url_side}'
]
subprocess.run(cmd_side, timeout=15)
print("Side:", os.path.exists(out_side), os.path.getsize(out_side) if os.path.exists(out_side) else 0)

# 2. 3/4 Front view
html_front = base_html.replace('camera.position.set(0, 11, -36);', 'camera.position.set(24, 14, -20);')
html_front = html_front.replace('camera.lookAt(0, 9, 0);', 'camera.lookAt(-2, 9, 0);')
with open('scratch/view_refined_rick_front.html', 'w', encoding='utf-8') as f:
    f.write(html_front)

out_front = os.path.abspath('scratch/refined_rick_front.png')
url_front = os.path.abspath('scratch/view_refined_rick_front.html').replace('\\', '/')
cmd_front = [
    chrome_path, '--headless=new', '--no-sandbox', '--allow-file-access-from-files',
    '--enable-webgl', '--use-gl=angle', '--window-size=1280,720', '--virtual-time-budget=3000',
    f'--screenshot={out_front}', f'file:///{url_front}'
]
subprocess.run(cmd_front, timeout=15)
print("Front:", os.path.exists(out_front), os.path.getsize(out_front) if os.path.exists(out_front) else 0)

# 3. Passenger Close-up view
html_close = base_html.replace('camera.position.set(0, 11, -36);', 'camera.position.set(-4, 12, -20);')
html_close = html_close.replace('camera.lookAt(0, 9, 0);', 'camera.lookAt(-7, 10, 0);')
with open('scratch/view_refined_rick_close.html', 'w', encoding='utf-8') as f:
    f.write(html_close)

out_close = os.path.abspath('scratch/refined_rick_close.png')
url_close = os.path.abspath('scratch/view_refined_rick_close.html').replace('\\', '/')
cmd_close = [
    chrome_path, '--headless=new', '--no-sandbox', '--allow-file-access-from-files',
    '--enable-webgl', '--use-gl=angle', '--window-size=1280,720', '--virtual-time-budget=3000',
    f'--screenshot={out_close}', f'file:///{url_close}'
]
subprocess.run(cmd_close, timeout=15)
print("Close:", os.path.exists(out_close), os.path.getsize(out_close) if os.path.exists(out_close) else 0)
