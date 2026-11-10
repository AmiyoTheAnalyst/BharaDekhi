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

tasks = [
    {"name": "test_side_profile.png", "arch": 2, "palette": 1, "outfit": 1, "view": "side"},
    {"name": "test_rear_number_plate.png", "arch": 2, "palette": 1, "outfit": 1, "view": "rear"},
    {"name": "test_front_hands_grip.png", "arch": 2, "palette": 1, "outfit": 1, "view": "front"},
    {"name": "test_front_headon.png", "arch": 2, "palette": 1, "outfit": 1, "view": "headon"},
    {"name": "test_cruiser_connected.png", "arch": 1, "palette": 3, "outfit": 0, "view": "side"},
    {"name": "test_cruiser_body.png", "arch": 1, "palette": 3, "outfit": 0, "view": "cruiser_body"},
    {"name": "test_face_clean_shaven.png", "arch": 0, "palette": 0, "outfit": 0, "view": "face"},
    {"name": "test_face_beard.png", "arch": 4, "palette": 0, "outfit": 2, "view": "face"}
]

for item in tasks:
    out_path = os.path.abspath(os.path.join("scratch", item["name"]))
    outfit_param = f"&outfit={item['outfit']}" if 'outfit' in item else ""
    url = f"http://127.0.0.1:{PORT}/scratch/test_complete_bike.html?archetype={item['arch']}&palette={item['palette']}{outfit_param}&view={item['view']}"
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
