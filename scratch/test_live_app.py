import os
import subprocess

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
user_data = os.path.abspath('scratch/chrome_tmp_app')
os.makedirs(user_data, exist_ok=True)
index_html = os.path.abspath('index.html')
out_png = os.path.abspath('scratch/app_live_render.png')

cmd = [
    chrome_path,
    '--headless=new',
    '--no-sandbox',
    '--allow-file-access-from-files',
    '--enable-webgl',
    '--use-gl=angle',
    '--window-size=1280,720',
    f'--user-data-dir={user_data}',
    f'--screenshot={out_png}',
    f'file:///{index_html.replace(os.sep, "/")}'
]

res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
print('Live app screenshot size:', os.path.getsize(out_png) if os.path.exists(out_png) else 'NOT FOUND')
