import http.server
import socketserver
import threading
import time
import subprocess
import os
import socket
import json

def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

PORT = find_free_port()

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

def run_server(server_ready_event):
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("127.0.0.1", PORT), QuietHandler) as httpd:
            server_ready_event.set()
            httpd.serve_forever()
    except Exception as e:
        print(f"Server error: {e}", flush=True)

ready = threading.Event()
t = threading.Thread(target=run_server, args=(ready,), daemon=True)
t.start()
ready.wait(timeout=5)
print(f"Server on {PORT}")

# Let's run chrome with remote debugging to fetch console errors
chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
import urllib.request

debug_port = find_free_port()
cmd = [
    chrome_path,
    "--headless=new",
    "--no-sandbox",
    f"--remote-debugging-port={debug_port}",
    "--enable-webgl",
    "--use-gl=angle",
    f"http://127.0.0.1:{PORT}/index.html?view=3d"
]

proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
time.sleep(3)

try:
    with urllib.request.urlopen(f"http://127.0.0.1:{debug_port}/json") as resp:
        tabs = json.loads(resp.read().decode())
        print("Tabs:", tabs)
except Exception as e:
    print("Debug error:", e)

proc.terminate()
