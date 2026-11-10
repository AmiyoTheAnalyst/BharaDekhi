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
user_data = os.path.abspath("scratch/chrome_tmp_test")
os.makedirs(user_data, exist_ok=True)

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("127.0.0.1", PORT), QuietHandler)
t = threading.Thread(target=httpd.serve_forever, daemon=True)
t.start()
print(f"Test server running on port {PORT}")

archetypes = [
    {"name": "test_arch0_streetfighter.png", "arch": 0, "palette": 1},
    {"name": "test_arch1_cruiser.png", "arch": 1, "palette": 3},
    {"name": "test_arch2_supersport.png", "arch": 2, "palette": 1},
    {"name": "test_arch3_hyperbike.png", "arch": 3, "palette": 2},
    {"name": "test_arch4_caferacer.png", "arch": 4, "palette": 0}
]

for item in archetypes:
    out_path = os.path.abspath(os.path.join("scratch", item["name"]))
    url = f"http://127.0.0.1:{PORT}/scratch/test_complete_bike.html?archetype={item['arch']}&palette={item['palette']}"
    cmd = [
        chrome_path,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        f"--user-data-dir={user_data}",
        f"--screenshot={out_path}",
        "--window-size=1200,800",
        "--virtual-time-budget=2000",
        url
    ]
    res = subprocess.run(cmd)
    if os.path.exists(out_path):
        print(f"SUCCESS: {item['name']} ({os.path.getsize(out_path)} bytes)")
    else:
        print(f"FAILED: {item['name']}")
