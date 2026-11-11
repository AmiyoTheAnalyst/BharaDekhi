import subprocess
import os

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
user_data = os.path.abspath("scratch/chrome_tmp_test")
studio_path = os.path.abspath("scratch/inspect_visuals.html").replace("\\", "/")

cmd = [
    chrome_path,
    "--headless=new",
    "--no-sandbox",
    "--allow-file-access-from-files",
    "--enable-webgl",
    "--use-gl=angle",
    "--enable-logging=stderr",
    "--v=1",
    f"--user-data-dir={user_data}",
    "--virtual-time-budget=2000",
    f"file:///{studio_path}?target=bus"
]

res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
print("STDERR:")
print(res.stderr[:2000])
