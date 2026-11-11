import subprocess
import os

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
user_data = os.path.abspath('scratch/chrome_tmp_capture_45s')
os.makedirs(user_data, exist_ok=True)
index_path = os.path.abspath('index.html').replace('\\', '/')
out_file = os.path.abspath('scratch/pc_3d_test_captured.png')
if os.path.exists(out_file): os.remove(out_file)

cmd = [
    chrome_path,
    '--headless=new',
    '--no-sandbox',
    '--allow-file-access-from-files',
    '--enable-webgl',
    '--use-gl=angle',
    '--disable-extensions',
    '--disable-default-apps',
    '--window-size=1920,1080',
    f'--user-data-dir={user_data}',
    f'--screenshot={out_file}',
    f'file:///{index_path}?mode3d=true'
]

res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=45)
print('Screenshot size:', os.path.getsize(out_file) if os.path.exists(out_file) else 0)
