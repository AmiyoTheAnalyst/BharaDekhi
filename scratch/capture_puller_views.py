import os
import subprocess
import re

with open('scratch/test_perfect_puller.html', 'r', encoding='utf-8') as f:
    base_html = f.read()

views = [
    ('scratch/puller_screenshot_match.png', (9.5, 14.5, 10.5), (3.0, 9.0, 0)),
    ('scratch/puller_front_view.png', (12.0, 11.5, 0), (3.0, 11.0, 0)),
    ('scratch/puller_side_view.png', (2.0, 9.5, 22.0), (2.0, 9.5, 0)),
    ('scratch/puller_face_close.png', (6.5, 12.8, 3.5), (3.4, 12.35, 0))
]

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
user_data = os.path.abspath('scratch/chrome_tmp_perfect_puller')
os.makedirs(user_data, exist_ok=True)

cam_regex = r'camera\.position\.set\([^)]+\);\s*camera\.lookAt\([^)]+\);'

for out_name, cam_pos, look_at in views:
    cam_setup = f'camera.position.set({cam_pos[0]}, {cam_pos[1]}, {cam_pos[2]});\n  camera.lookAt({look_at[0]}, {look_at[1]}, {look_at[2]});'
    content = re.sub(cam_regex, cam_setup, base_html)

    temp_html_path = os.path.abspath(f'scratch/temp_{os.path.basename(out_name)}.html')
    with open(temp_html_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    out_png = os.path.abspath(out_name)
    if os.path.exists(out_png):
        try: os.remove(out_png)
        except: pass

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
        f'file:///{temp_html_path.replace(os.sep, "/")}'
    ]
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=15)
        print(f'{out_name}: exists={os.path.exists(out_png)}, size={os.path.getsize(out_png) if os.path.exists(out_png) else 0}')
    except Exception as e:
        print(f'Error for {out_name}: {e}')
