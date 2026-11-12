import subprocess
import os

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
user_data = os.path.abspath('scratch/chrome_tmp_focus_rick')
os.makedirs(user_data, exist_ok=True)
index_path = os.path.abspath('index.html').replace('\\', '/')
out_png = os.path.abspath('scratch/live_app_rickshaw_focused.png')

with open('scratch/run_focus_test.html', 'w', encoding='utf-8') as f:
    f.write(f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<iframe id="appFrame" src="file:///{index_path}" style="width: 1920px; height: 1080px; border: none;"></iframe>
<script>
  window.onload = () => {{
    const frame = document.getElementById('appFrame');
    setTimeout(() => {{
      const win = frame.contentWindow;
      console.log('FOCUS: Switching to 3D mode...');
      win.setCrossroadsViewMode(true);
      
      setTimeout(() => {{
        console.log('FOCUS: Focusing on rickshaw...');
        if (win.crossroadsFocusMode) {{
          win.crossroadsFocusMode('rickshaw');
        }}
      }}, 3000);
    }}, 2000);
  }};
</script>
</body>
</html>""")

cmd = [
    chrome_path,
    '--headless=new',
    '--no-sandbox',
    '--allow-file-access-from-files',
    '--enable-webgl',
    '--use-gl=angle',
    '--window-size=1920,1080',
    f'--user-data-dir={user_data}',
    '--enable-logging=stderr',
    '--v=1',
    '--virtual-time-budget=9000',
    f'--screenshot={out_png}',
    f'file:///{os.path.abspath("scratch/run_focus_test.html").replace(chr(92), "/")}'
]

try:
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=25)
    for line in res.stderr.decode('utf-8', errors='ignore').splitlines():
        if 'FOCUS' in line or 'CONSOLE' in line or 'Uncaught' in line or 'Error' in line:
            print(line)
except Exception as e:
    print('Exception:', e)

print('Screenshot exists:', os.path.exists(out_png), 'size:', os.path.getsize(out_png) if os.path.exists(out_png) else 0)
