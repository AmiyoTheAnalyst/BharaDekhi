import subprocess
import os

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
user_data = os.path.abspath("scratch/chrome_tmp_studio")
os.makedirs(user_data, exist_ok=True)

studio_path = os.path.abspath("scratch/inspect_visuals.html").replace("\\", "/")

targets = [
    ("inspect_cng_glb.png", f"file:///{studio_path}?target=cng&view=side", "1280,720"),
    ("inspect_cng_front.png", f"file:///{studio_path}?target=cng&view=front", "1280,720"),
    ("inspect_rickshaw_glb.png", f"file:///{studio_path}?target=rickshaw&view=side", "1280,720"),
    ("inspect_rickshaw_puller_glb.png", f"file:///{studio_path}?target=rickshaw&view=puller", "1280,720"),
    ("inspect_bus_glb.png", f"file:///{studio_path}?target=bus&view=side", "1280,720"),
    ("inspect_bus_banner_glb.png", f"file:///{studio_path}?target=bus&view=banner", "1280,720"),
    ("inspect_bus_rear_wheels_glb.png", f"file:///{studio_path}?target=bus&view=rear_wheels", "1280,720"),
    ("inspect_bike_blue_glb.png", f"file:///{studio_path}?target=bike&seed=0&archetype=2&view=head", "1280,720"),
    ("inspect_bike_side_glb.png", f"file:///{studio_path}?target=bike&seed=0&archetype=2&view=side", "1280,720"),
    ("inspect_pedestrians.png", f"file:///{studio_path}?target=pedestrian", "1280,720"),
]

for out_name, url, window_size in targets:
    out_file = os.path.abspath(os.path.join("scratch", out_name))
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
        f"--window-size={window_size}",
        f"--user-data-dir={user_data}",
        "--virtual-time-budget=3500",
        f"--screenshot={out_file}",
        url
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    print(f"Captured {out_name}, exists: {os.path.exists(out_file)}, size: {os.path.getsize(out_file) if os.path.exists(out_file) else 0}")
