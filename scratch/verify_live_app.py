import subprocess
import os
import shutil

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
html_path = os.path.abspath('index.html').replace('\\', '/')

# 1. PC 3D View (1920x1080)
out_pc = os.path.abspath('scratch/live_pc_3d.png')
cmd_pc = [
    chrome_path, '--headless=new', '--no-sandbox', '--allow-file-access-from-files',
    '--enable-webgl', '--use-gl=angle', '--window-size=1920,1080', '--virtual-time-budget=5000',
    f'--screenshot={out_pc}', f'file:///{html_path}?mode3d=true'
]
subprocess.run(cmd_pc, timeout=20)

# 2. Mobile 3D View (390x844)
out_mob = os.path.abspath('scratch/live_mobile_3d.png')
cmd_mob = [
    chrome_path, '--headless=new', '--no-sandbox', '--allow-file-access-from-files',
    '--enable-webgl', '--use-gl=angle', '--window-size=390,844', '--virtual-time-budget=5000',
    f'--screenshot={out_mob}', f'file:///{html_path}?mode3d=true'
]
subprocess.run(cmd_mob, timeout=20)

dest_dir = r'C:\Users\HP\.gemini\antigravity\brain\a2d3aea8-cfe9-491c-9b42-9d7a3c2c4ed8'
if os.path.exists(out_pc):
    shutil.copy(out_pc, os.path.join(dest_dir, 'live_pc_3d.png'))
if os.path.exists(out_mob):
    shutil.copy(out_mob, os.path.join(dest_dir, 'live_mobile_3d.png'))

print('Captured live PC and Mobile 3D screenshots!')
