import subprocess
import os

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
user_data = os.path.abspath("scratch/chrome_tmp_test")
os.makedirs(user_data, exist_ok=True)

out_file = os.path.abspath("scratch/test_bike_look.png")
if os.path.exists(out_file):
    try: os.remove(out_file)
    except: pass

index_path = os.path.abspath("index.html").replace("\\", "/")
url = f"file:///{index_path}?view=3d&cam=bike&center=1"

cmd = [
    chrome_path,
    "--headless=new",
    "--no-sandbox",
    "--allow-file-access-from-files",
    "--enable-webgl",
    "--use-gl=angle",
    f"--user-data-dir={user_data}",
    f"--screenshot={out_file}",
    "--window-size=1280,720",
    "--run-all-compositor-stages-before-draw",
    url
]

print("Running chrome with file URL...", flush=True)
res = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
if os.path.exists(out_file):
    print(f"Captured: {out_file} ({os.path.getsize(out_file)} bytes)", flush=True)
else:
    print(f"Failed. Stderr: {res.stderr[:200]}", flush=True)
