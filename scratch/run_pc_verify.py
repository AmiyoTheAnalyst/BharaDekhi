import subprocess
import os
import shutil

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
user_data = os.path.abspath('scratch/chrome_tmp_vp')
os.makedirs(user_data, exist_ok=True)
index_path = os.path.abspath('index.html').replace('\\', '/')
html_file = 'scratch/test_verify_pc3d.html'
screenshot_file = os.path.abspath('scratch/pc_3d_final.png')

html_content = """<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0; padding:0; overflow:hidden;">
<iframe id="appFrame" src="file:///{INDEX}" style="width: 1920px; height: 1080px; border: none;"></iframe>
<script>
  window.onload = () => {
    const frame = document.getElementById('appFrame');
    setTimeout(() => {
      const win = frame.contentWindow;
      console.log('[VERIFY] Setting 3D mode...');
      if (win.setCrossroadsViewMode) win.setCrossroadsViewMode(true);
      setTimeout(() => {
        console.log('[VERIFY] 3D Ready: ' + (win.isDhakaCrossroads3DReady ? win.isDhakaCrossroads3DReady() : 'no fn'));
      }, 3000);
    }, 2000);
  };
</script>
</body>
</html>""".replace('{INDEX}', index_path)

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(html_content)

cmd = [
    chrome_path, '--headless=new', '--no-sandbox', '--allow-file-access-from-files',
    '--enable-webgl', '--use-gl=angle', '--window-size=1920,1080',
    f'--user-data-dir={user_data}', '--enable-logging=stderr', '--v=1',
    '--virtual-time-budget=8000', f'--screenshot={screenshot_file}',
    f'file:///{os.path.abspath(html_file).replace(chr(92), "/")}'
]

res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=40)
size = os.path.getsize(screenshot_file) if os.path.exists(screenshot_file) else 0
print('Screenshot size:', size)
dest_dir = r'C:\Users\HP\.gemini\antigravity\brain\a2d3aea8-cfe9-491c-9b42-9d7a3c2c4ed8'
if os.path.exists(screenshot_file):
    shutil.copy(screenshot_file, os.path.join(dest_dir, 'pc_3d_final.png'))
for line in res.stderr.decode('utf-8', errors='ignore').splitlines():
    if '[VERIFY]' in line:
        print('LOG:', line)
