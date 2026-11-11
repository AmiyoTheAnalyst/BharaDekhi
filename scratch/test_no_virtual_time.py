import subprocess
import os

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
user_data = os.path.abspath('scratch/chrome_tmp_test_timeout')
os.makedirs(user_data, exist_ok=True)
index_path = os.path.abspath('index.html').replace('\\', '/')
out_file = os.path.abspath('scratch/pc_3d_test_now.png')
if os.path.exists(out_file): os.remove(out_file)

cmd = [
    chrome_path,
    '--headless=new',
    '--no-sandbox',
    '--allow-file-access-from-files',
    '--enable-webgl',
    '--use-gl=angle',
    '--window-size=1920,1080',
    f'--user-data-dir={user_data}',
    f'--screenshot={out_file}',
    f'file:///{index_path}?mode3d=true'
]

# Run without virtual-time-budget - Chrome captures screenshot as soon as first frame renders!
res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10)
print('Screenshot size:', os.path.getsize(out_file) if os.path.exists(out_file) else 0)
