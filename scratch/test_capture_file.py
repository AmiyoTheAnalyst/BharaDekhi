import subprocess
import os

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
user_data = os.path.abspath("scratch/chrome_tmp_test")
os.makedirs(user_data, exist_ok=True)

studio_path = os.path.abspath("scratch/inspect_visuals.html").replace("\\", "/")
out_file = os.path.abspath("scratch/test_capture.png")
if os.path.exists(out_file):
    os.remove(out_file)

cmd = [
    chrome_path,
    "--headless=new",
    "--no-sandbox",
    "--allow-file-access-from-files",
    "--enable-webgl",
    "--use-gl=angle",
    "--hide-scrollbars",
    "--window-size=1280,720",
    f"--user-data-dir={user_data}",
    "--virtual-time-budget=3000",
    f"--screenshot={out_file}",
    f"file:///{studio_path}?target=bus"
]

res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
print("Return code:", res.returncode)
print("File exists:", os.path.exists(out_file), "Size:", os.path.getsize(out_file) if os.path.exists(out_file) else 0)
