import os
import subprocess

with open('scratch/test_cng_local.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Zoom camera back
text = text.replace('camera.position.set(0.5, 6.2, 22.0);', 'camera.position.set(0, 8.0, 42.0);')
text = text.replace('camera.lookAt(0.5, 5.0, 0);', 'camera.lookAt(0, 5.0, 0);')

with open('scratch/test_cng_local.html', 'w', encoding='utf-8') as f:
    f.write(text)

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
user_data = os.path.abspath('scratch/chrome_tmp_cng')
html_file = os.path.abspath('scratch/test_cng_local.html')
out_png = os.path.abspath('scratch/current_cng_side.png')

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
    f'file:///{html_file.replace(os.sep, "/")}'
]

subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
print('Done. Size:', os.path.getsize(out_png))
