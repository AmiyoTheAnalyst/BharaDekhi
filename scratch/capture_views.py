import subprocess
import os
import shutil

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

with open('scratch/test_sculpted.html', 'r', encoding='utf-8') as f:
    base_html = f.read()

# 1. Rickshaw view
html_rick = base_html.replace('camera.position.set(22, 14, 4);', 'camera.position.set(18, 12, 1);')
html_rick = html_rick.replace('camera.lookAt(0, 8, -14);', 'camera.lookAt(0, 8, -14);')
with open('scratch/view_rick.html', 'w', encoding='utf-8') as f:
    f.write(html_rick)

out_rick = os.path.abspath('scratch/sculpted_rickshaw.png')
url_rick = os.path.abspath('scratch/view_rick.html').replace('\\', '/')
cmd_rick = [
    chrome_path, '--headless=new', '--no-sandbox', '--allow-file-access-from-files',
    '--enable-webgl', '--use-gl=angle', '--window-size=1280,720', '--virtual-time-budget=3000',
    f'--screenshot={out_rick}', f'file:///{url_rick}'
]
subprocess.run(cmd_rick, timeout=15)

# 2. CNG view
html_cng = base_html.replace('camera.position.set(22, 14, 4);', 'camera.position.set(24, 13, 30);')
html_cng = html_cng.replace('camera.lookAt(0, 8, -14);', 'camera.lookAt(0, 7, 14);')
with open('scratch/view_cng.html', 'w', encoding='utf-8') as f:
    f.write(html_cng)

out_cng = os.path.abspath('scratch/sculpted_cng.png')
url_cng = os.path.abspath('scratch/view_cng.html').replace('\\', '/')
cmd_cng = [
    chrome_path, '--headless=new', '--no-sandbox', '--allow-file-access-from-files',
    '--enable-webgl', '--use-gl=angle', '--window-size=1280,720', '--virtual-time-budget=3000',
    f'--screenshot={out_cng}', f'file:///{url_cng}'
]
subprocess.run(cmd_cng, timeout=15)

shutil.copy('scratch/sculpted_rickshaw.png', r'C:\Users\HP\.gemini\antigravity\brain\a2d3aea8-cfe9-491c-9b42-9d7a3c2c4ed8\sculpted_rickshaw.png')
shutil.copy('scratch/sculpted_cng.png', r'C:\Users\HP\.gemini\antigravity\brain\a2d3aea8-cfe9-491c-9b42-9d7a3c2c4ed8\sculpted_cng.png')
print('Rickshaw size:', os.path.getsize(out_rick))
print('CNG size:', os.path.getsize(out_cng))
