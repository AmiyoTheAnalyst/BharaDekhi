import subprocess
import os

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
index_path = os.path.abspath('index.html').replace('\\', '/')

def capture(mode, w, h, fname):
    out = os.path.abspath(f'scratch/{fname}')
    if os.path.exists(out): os.remove(out)
    user_data = os.path.abspath(f'scratch/chrome_tmp_{mode}')
    cmd = [
        chrome_path,
        '--headless=new',
        '--no-sandbox',
        '--allow-file-access-from-files',
        '--enable-webgl',
        '--use-gl=angle',
        f'--window-size={w},{h}',
        f'--user-data-dir={user_data}',
        '--virtual-time-budget=3000',
        f'--screenshot={out}',
        f'file:///{index_path}?mode3d=true'
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=25)
    print(f'{mode}: exists={os.path.exists(out)}, size={os.path.getsize(out) if os.path.exists(out) else 0}')

capture('pc', 1920, 1080, 'pc_final_3d.png')
capture('mobile', 390, 844, 'mobile_final_3d.png')
