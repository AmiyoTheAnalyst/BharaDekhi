import subprocess
import os

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
user_data = os.path.abspath('scratch/chrome_tmp_debug_error')
os.makedirs(user_data, exist_ok=True)
index_path = os.path.abspath('index.html').replace('\\', '/')

with open('scratch/run_harness_error.html', 'w', encoding='utf-8') as f:
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
      const doc = frame.contentDocument;
      
      console.log('CALLING_INIT: start');
      try {{
        // Check window.crossroadsVehiclesData
        console.log('VehiclesData: ' + (win.crossroadsVehiclesData ? win.crossroadsVehiclesData.length : 'undefined'));
        console.log('PedestriansData: ' + (win.crossroadsPedestriansData ? win.crossroadsPedestriansData.length : 'undefined'));
        
        win.initDhakaCrossroads3D('dhakaCrossroads3dCanvas', 'dhakaCrossroadsContainer', win.crossroadsVehiclesData, win.crossroadsPedestriansData);
        console.log('CALLING_INIT: finished without exception');
        console.log('isReady: ' + win.isDhakaCrossroads3DReady());
      }} catch (e) {{
        console.log('CALLING_INIT_ERROR: ' + e.message + '\\n' + e.stack);
      }}
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
    '--enable-logging=stderr',
    '--v=1',
    '--window-size=1920,1080',
    f'--user-data-dir={user_data}',
    '--virtual-time-budget=6000',
    f'file:///{os.path.abspath("scratch/run_harness_error.html").replace("\\\\", "/")}'
]

res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=25)
err_lines = res.stderr.decode('utf-8', errors='ignore').splitlines()
for l in err_lines:
    if 'CALLING_INIT' in l or 'isReady' in l or 'VehiclesData' in l or 'PedestriansData' in l:
        print(l)
