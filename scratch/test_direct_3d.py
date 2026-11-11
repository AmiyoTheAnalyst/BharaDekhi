import subprocess
import os

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
user_data = os.path.abspath('scratch/chrome_tmp_direct_3d')
os.makedirs(user_data, exist_ok=True)
index_path = os.path.abspath('index.html').replace('\\', '/')
out_file = os.path.abspath('scratch/direct_3d.png')

cmd = [
    chrome_path,
    '--headless=new',
    '--no-sandbox',
    '--allow-file-access-from-files',
    '--enable-webgl',
    '--use-gl=angle',
    '--enable-logging=stderr',
    '--v=1',
    '--window-size=1920,1080',
    f'--user-data-dir={user_data}',
    '--virtual-time-budget=6000',
    f'--screenshot={out_file}',
    f'file:///{index_path}?mode3d=true'
]

res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=25)
print('Screenshot size:', os.path.getsize(out_file) if os.path.exists(out_file) else 0)
err_lines = res.stderr.decode('utf-8', errors='ignore').splitlines()
for l in err_lines:
    if 'CONSOLE' in l or 'error' in l.lower() and 'component' not in l.lower():
        print(l)
