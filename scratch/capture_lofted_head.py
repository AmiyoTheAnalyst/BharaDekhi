import subprocess
import os

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
html_path = os.path.abspath("scratch/test_lofted_head.html")
out_png = os.path.abspath("scratch/renders/lofted_head_preview.png")

cmd = [
    chrome_path,
    "--headless=new",
    "--no-sandbox",
    "--enable-webgl",
    "--use-gl=angle",
    "--allow-file-access-from-files",
    f"--screenshot={out_png}",
    "--window-size=1200,800",
    "--run-all-compositor-stages-before-draw",
    f"file:///{html_path}"
]

print("Capturing lofted head...")
res = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
print("File exists:", os.path.exists(out_png))
if os.path.exists(out_png):
    print("Size:", os.path.getsize(out_png))
else:
    print("Stderr:", res.stderr)
