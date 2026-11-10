import subprocess
import os

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
html_path = os.path.abspath("scratch/test_face_render.html")
out_png = os.path.abspath("scratch/renders/face_preview.png")

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

print("Capturing face preview...")
res = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
if os.path.exists(out_png):
    print("SUCCESS, size:", os.path.getsize(out_png))
else:
    print("FAILED:", res.stderr)
