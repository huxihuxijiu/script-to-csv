#!/usr/bin/env python3
"""Minimal static HTTP server that never calls os.getcwd()."""
import http.server, socketserver, os

ROOT = '/Users/lindaiyu/Documents/script-to-csv'
PORT = 3333

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)
    def log_message(self, fmt, *args):
        pass  # suppress request noise

os.chdir(ROOT)
with socketserver.TCPServer(('', PORT), Handler) as httpd:
    print(f'Serving on http://localhost:{PORT}', flush=True)
    httpd.serve_forever()
