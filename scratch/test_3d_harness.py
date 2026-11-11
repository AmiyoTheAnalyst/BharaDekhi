import subprocess
import os

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
user_data = os.path.abspath('scratch/chrome_tmp_debug_3d_state')
os.makedirs(user_data, exist_ok=True)
index_path = os.path.abspath('index.html').replace('\\', '/')

with open('scratch/run_harness.html', 'w', encoding='utf-8') as f:
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
      
      console.log('TEST_LOG: 1. Calling win.setCrossroadsViewMode(true)...');
      try {{
        win.setCrossroadsViewMode(true);
      }} catch (e) {{
        console.log('TEST_LOG: Error calling setCrossroadsViewMode: ' + e.message);
      }}

      setTimeout(() => {{
        try {{
          const canvas = doc.getElementById('dhakaCrossroads3dCanvas');
          const container = doc.getElementById('dhakaCrossroadsContainer');
          const stageWrapper = doc.getElementById('dhakaCrossroadsStageWrapper');
          
          console.log('TEST_LOG: canvas display: ' + (canvas ? canvas.style.display : 'no canvas'));
          console.log('TEST_LOG: canvas opacity: ' + (canvas ? getComputedStyle(canvas).opacity : 'no canvas'));
          console.log('TEST_LOG: canvas rect: ' + (canvas ? JSON.stringify(canvas.getBoundingClientRect()) : ''));
          console.log('TEST_LOG: canvas width/height attr: ' + (canvas ? canvas.width + 'x' + canvas.height : ''));
          console.log('TEST_LOG: container classes: ' + (container ? container.className : ''));
          console.log('TEST_LOG: stageWrapper display: ' + (stageWrapper ? stageWrapper.style.display : ''));
          console.log('TEST_LOG: isDhakaCrossroads3DReady: ' + (win.isDhakaCrossroads3DReady ? win.isDhakaCrossroads3DReady() : 'fn not found'));
          console.log('TEST_LOG: metrics: ' + (win.getDhakaCrossroads3DMetrics ? JSON.stringify(win.getDhakaCrossroads3DMetrics()) : 'no metrics'));
        }} catch(err) {{
          console.log('TEST_LOG: Inspection error: ' + err.message);
        }}
      }}, 2500);
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
    '--virtual-time-budget=8000',
    f'file:///{os.path.abspath("scratch/run_harness.html").replace("\\\\", "/")}'
]

res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=25)
err_lines = res.stderr.decode('utf-8', errors='ignore').splitlines()
for l in err_lines:
    if 'TEST_LOG' in l or 'error' in l.lower() and 'component' not in l.lower():
        print(l)
