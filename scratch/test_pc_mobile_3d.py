import subprocess
import os
import shutil

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
user_data = os.path.abspath('scratch/chrome_tmp_fresh_test')
if os.path.exists(user_data):
    shutil.rmtree(user_data, ignore_errors=True)
os.makedirs(user_data, exist_ok=True)

index_path = os.path.abspath('index.html').replace('\\', '/')

# Run PC 3D Test
pc_screenshot = os.path.abspath('scratch/pc_3d_verified.png')
cmd_pc = [
    chrome_path,
    '--headless=new',
    '--no-sandbox',
    '--allow-file-access-from-files',
    '--enable-webgl',
    '--use-gl=angle',
    '--window-size=1920,1080',
    f'--user-data-dir={user_data}',
    '--virtual-time-budget=5000',
    f'--screenshot={pc_screenshot}',
    f'file:///{index_path}?mode3d=true'
]
res_pc = subprocess.run(cmd_pc, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20)
print('PC 3D Screenshot size:', os.path.getsize(pc_screenshot) if os.path.exists(pc_screenshot) else 0)

# Run Mobile 3D Test (iPhone 14/15 size: 390x844)
user_data_mobile = os.path.abspath('scratch/chrome_tmp_fresh_mobile')
if os.path.exists(user_data_mobile):
    shutil.rmtree(user_data_mobile, ignore_errors=True)
os.makedirs(user_data_mobile, exist_ok=True)

mobile_screenshot = os.path.abspath('scratch/mobile_3d_verified.png')
cmd_mobile = [
    chrome_path,
    '--headless=new',
    '--no-sandbox',
    '--allow-file-access-from-files',
    '--enable-webgl',
    '--use-gl=angle',
    '--window-size=390,844',
    f'--user-data-dir={user_data_mobile}',
    '--virtual-time-budget=5000',
    f'--screenshot={mobile_screenshot}',
    f'file:///{index_path}?mode3d=true'
]
res_mobile = subprocess.run(cmd_mobile, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20)
print('Mobile 3D Screenshot size:', os.path.getsize(mobile_screenshot) if os.path.exists(mobile_screenshot) else 0)
