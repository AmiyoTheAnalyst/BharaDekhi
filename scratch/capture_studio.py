import subprocess
import os
import time

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
user_data = os.path.abspath("scratch/chrome_tmp_studio")
os.makedirs(user_data, exist_ok=True)

studio_path = os.path.abspath("scratch/inspect_visuals.html").replace("\\", "/")

targets = [
    ("inspect_bike_blue.png", f"file:///{studio_path}?target=bike&seed=0&view=head", "1280,720"),
    ("inspect_bike_orange.png", f"file:///{studio_path}?target=bike&seed=1&view=head", "1280,720"),
    ("inspect_bike_full.png", f"file:///{studio_path}?target=bike&archetype=2&seed=0&view=side", "1280,720"),
    ("inspect_rickshaw_puller.png", f"file:///{studio_path}?target=rickshaw&view=puller", "1280,720"),
    ("inspect_rickshaw_side.png", f"file:///{studio_path}?target=rickshaw&view=side", "1280,720"),
    ("inspect_cng.png", f"file:///{studio_path}?target=cng&view=side", "1280,720"),
    ("inspect_bus.png", f"file:///{studio_path}?target=bus&view=side", "1280,720"),
    ("inspect_pedestrians.png", f"file:///{studio_path}?target=pedestrians", "1440,720")
]

for name, url, size in targets:
    out_file = os.path.abspath(os.path.join("scratch", name))
    if os.path.exists(out_file):
        try: os.remove(out_file)
        except: pass

    cmd = [
        chrome_path,
        "--headless=new",
        "--no-sandbox",
        "--allow-file-access-from-files",
        "--enable-webgl",
        "--use-gl=angle",
        f"--user-data-dir={user_data}",
        f"--screenshot={out_file}",
        f"--window-size={size}",
        "--run-all-compositor-stages-before-draw",
        url
    ]
    print(f"Capturing {name}...", flush=True)
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=25)
    if os.path.exists(out_file) and os.path.getsize(out_file) > 0:
        print(f"SUCCESS: {name} ({os.path.getsize(out_file)} bytes)", flush=True)
    else:
        print(f"FAILED {name}: {res.stderr[:200]}", flush=True)

print("All studio captures done!", flush=True)
