import os
import subprocess
import re

with open('scratch/test_perfect_dhaka_rickshaw.html', 'r', encoding='utf-8') as f:
    base_html = f.read()

views = [
    ('scratch/perfect_side_lady.png', (1.5, 8.5, 36), (1.5, 8.5, 0)),
    ('scratch/perfect_side_man.png', (1.5, 8.5, -36), (1.5, 8.5, 0)),
    ('scratch/perfect_close_lady.png', (-7.5, 12.0, 13), (-7.5, 11.5, 3.4)),
    ('scratch/perfect_close_man.png', (-7.5, 12.0, -13), (-7.5, 11.5, -3.4)),
    ('scratch/perfect_close_puller.png', (3.5, 11.0, 11), (3.2, 10.5, 0))
]

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
user_data = os.path.abspath('scratch/chrome_tmp_perfect_rick')
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
