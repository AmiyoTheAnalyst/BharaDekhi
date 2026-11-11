import subprocess
import os

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
user_data = os.path.abspath('scratch/chrome_tmp_viewport_test')
os.makedirs(user_data, exist_ok=True)
index_path = os.path.abspath('index.html').replace('\\', '/')

test_cases = [
    ('pc_2d', 1920, 1080, False),
    ('pc_3d', 1920, 1080, True),
    ('mobile_2d', 390, 844, False),
    ('mobile_3d', 390, 844, True)
]

for name, w, h, is_3d in test_cases:
    html_file = f'scratch/test_{name}.html'
    screenshot_file = os.path.abspath(f'scratch/{name}.png')
    
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0; padding:0; overflow:hidden;">
<iframe id="appFrame" src="file:///{index_path}" style="width: {w}px; height: {h}px; border: none;"></iframe>
<script>
  window.onload = () => {{
    const frame = document.getElementById('appFrame');
    setTimeout(() => {{
      const win = frame.contentWindow;
      const doc = frame.contentDocument;
      
      console.log('[{name}] Setting view mode 3D={is_3d}...');
      if ({str(is_3d).lower()}) {{
        win.setCrossroadsViewMode(true);
      }}
      
      setTimeout(() => {{
        const canvas = doc.getElementById('dhakaCrossroads3dCanvas');
        const stageWrapper = doc.getElementById('dhakaCrossroadsStageWrapper');
        const container = doc.getElementById('dhakaCrossroadsContainer');
        console.log('[{name}] Done waiting. canvas display: ' + (canvas ? canvas.style.display : 'none'));
        console.log('[{name}] stageWrapper display: ' + (stageWrapper ? stageWrapper.style.display : 'none'));
        console.log('[{name}] 3D ready: ' + (win.isDhakaCrossroads3DReady ? win.isDhakaCrossroads3DReady() : 'fn missing'));
        if (win.getDhakaCrossroads3DMetrics) {{
          console.log('[{name}] metrics: ' + JSON.stringify(win.getDhakaCrossroads3DMetrics()));
        }}
      }}, 3000);
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
        f'--window-size={w},{h}',
        f'--user-data-dir={user_data}',
        '--enable-logging=stderr',
        '--v=1',
        '--virtual-time-budget=7000',
        f'--screenshot={screenshot_file}',
        f'file:///{os.path.abspath(html_file).replace("\\\\", "/")}'
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=25)
    size = os.path.getsize(screenshot_file) if os.path.exists(screenshot_file) else 0
    print(f'Test {name}: screenshot size = {size}')
    for line in res.stderr.decode('utf-8', errors='ignore').splitlines():
        if f'[{name}]' in line:
            print('  ', line)
