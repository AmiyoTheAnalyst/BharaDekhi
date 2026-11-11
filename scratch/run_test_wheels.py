import subprocess
import time

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
url = "file:///c:/Users/HP/Desktop/commute-dhaka-web/scratch/test_three_wheels.html"

cmd = [
    chrome_path,
    "--headless=new",
    "--no-sandbox",
    "--allow-file-access-from-files",
    "--enable-webgl",
    "--use-gl=angle",
    "--dump-dom",
    url
]

# We need to give it a couple of seconds to load GLBs and run JS
# With --virtual-time-budget=5000:
cmd.append("--virtual-time-budget=5000")

proc = subprocess.run(cmd, capture_output=True, text=True)
print(proc.stdout)
