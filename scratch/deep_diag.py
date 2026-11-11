import subprocess
import os

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
user_data = os.path.abspath('scratch/chrome_tmp_deep_diag')
os.makedirs(user_data, exist_ok=True)
index_path = os.path.abspath('index.html').replace('\\', '/')

with open('scratch/run_diag.html', 'w', encoding='utf-8') as f:
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
      
      console.log('DIAG: 1. Checking initial state:');
      console.log('DIAG: Crossroads running: ' + win.dhakaCrossroadsRunning);
      console.log('DIAG: 3D mode: ' + win.crossroads3DMode);
      
      // Toggle to 3D mode
      console.log('DIAG: 2. Switching to 3D mode...');
      win.setCrossroadsViewMode(true);
      
      setTimeout(() => {{
        console.log('DIAG: 3. After 2s in 3D mode:');
        console.log('DIAG: 3D ready: ' + (win.isDhakaCrossroads3DReady ? win.isDhakaCrossroads3DReady() : 'fn missing'));
        if (win.getDhakaCrossroads3DMetrics) {{
          console.log('DIAG: metrics: ' + JSON.stringify(win.getDhakaCrossroads3DMetrics()));
        }}
        const canvas = doc.getElementById('dhakaCrossroads3dCanvas');
        if (canvas) {{
          console.log('DIAG: canvas client: ' + canvas.clientWidth + 'x' + canvas.clientHeight);
          console.log('DIAG: canvas buffer: ' + canvas.width + 'x' + canvas.height);
          console.log('DIAG: canvas style display: ' + canvas.style.display);
          console.log('DIAG: canvas computed opacity: ' + getComputedStyle(canvas).opacity);
          console.log('DIAG: canvas computed zIndex: ' + getComputedStyle(canvas).zIndex);
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          console.log('DIAG: webgl context: ' + (gl ? 'obtained' : 'FAILED'));
          if (gl) {{
            console.log('DIAG: gl error: ' + gl.getError());
          }}
        }} else {{
          console.log('DIAG: NO CANVAS ELEMENT FOUND!');
        }}
        
        const stageWrapper = doc.getElementById('dhakaCrossroadsStageWrapper');
        if (stageWrapper) {{
          console.log('DIAG: stageWrapper style display: ' + stageWrapper.style.display);
          console.log('DIAG: stageWrapper computed display: ' + getComputedStyle(stageWrapper).display);
          console.log('DIAG: stageWrapper computed opacity: ' + getComputedStyle(stageWrapper).opacity);
        }}
      }}, 2500);
    }}, 1500);
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
    '--virtual-time-budget=8000',
    f'file:///{os.path.abspath("scratch/run_diag.html").replace("\\\\", "/")}'
]

res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=25)
for line in res.stderr.decode('utf-8', errors='ignore').splitlines():
    if 'DIAG:' in line or 'CONSOLE' in line or 'Error' in line and 'component' not in line:
        print(line)
