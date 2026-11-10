import http.server
import socketserver
import threading
import subprocess
import os
import socket

def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

PORT = find_free_port()
chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
user_data = os.path.abspath("scratch/chrome_tmp_bike")
os.makedirs(user_data, exist_ok=True)

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("127.0.0.1", PORT), QuietHandler)
t = threading.Thread(target=httpd.serve_forever, daemon=True)
t.start()
print(f"Server started on port {PORT}", flush=True)

tasks = [
    {
        "name": "bike_arch0_streetfighter.png",
        "url": f"http://127.0.0.1:{PORT}/index.html?view=3d&cam=bike&center=1&archetype=0&palette=1&outfit=0&yaw=2.25&pitch=0.25",
        "size": "1440,900"
    },
    {
        "name": "bike_arch1_cruiser.png",
        "url": f"http://127.0.0.1:{PORT}/index.html?view=3d&cam=bike&center=1&archetype=1&palette=3&outfit=0&yaw=2.25&pitch=0.25",
        "size": "1440,900"
    },
    {
        "name": "bike_arch2_supersport.png",
        "url": f"http://127.0.0.1:{PORT}/index.html?view=3d&cam=bike&center=1&archetype=2&palette=1&outfit=1&yaw=2.25&pitch=0.25",
        "size": "1440,900"
    },
    {
        "name": "bike_arch3_hyperbike.png",
        "url": f"http://127.0.0.1:{PORT}/index.html?view=3d&cam=bike&center=1&archetype=3&palette=2&outfit=1&yaw=2.25&pitch=0.25",
        "size": "1440,900"
    },
    {
        "name": "bike_arch4_caferacer.png",
        "url": f"http://127.0.0.1:{PORT}/index.html?view=3d&cam=bike&center=1&archetype=4&palette=0&outfit=2&yaw=2.25&pitch=0.25",
        "size": "1440,900"
    },
    {
        "name": "bike_mobile_390.png",
        "url": f"http://127.0.0.1:{PORT}/index.html?view=3d&cam=bike&center=1&archetype=1&palette=3&yaw=2.25&pitch=0.28",
        "size": "390,844"
    }
]

for task in tasks:
    out_file = os.path.abspath(os.path.join("scratch", task["name"]))
    if os.path.exists(out_file):
        try: os.remove(out_file)
        except: pass

    cmd = [
        chrome_path,
        "--headless=new",
        "--no-sandbox",
        "--enable-webgl",
        "--use-gl=angle",
        f"--user-data-dir={user_data}",
        f"--screenshot={out_file}",
        f"--window-size={task['size']}",
        "--run-all-compositor-stages-before-draw",
        task["url"]
    ]
    print(f"Capturing {task['name']}...", flush=True)
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=40)
        if os.path.exists(out_file) and os.path.getsize(out_file) > 0:
            print(f"SUCCESS: {task['name']} ({os.path.getsize(out_file)} bytes)", flush=True)
        else:
            print(f"FAILED {task['name']}: {res.stderr[:200]}", flush=True)
    except subprocess.TimeoutExpired:
        print(f"TIMEOUT on {task['name']}", flush=True)

httpd.shutdown()
print("All capture tasks complete!", flush=True)
