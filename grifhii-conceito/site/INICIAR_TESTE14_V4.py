#!/usr/bin/env python3
"""GRIFHII Teste 14 V4: isolated local server, always uses a free random port."""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import quote
import os,webbrowser
root=Path(__file__).resolve().parent
os.chdir(root)
class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control','no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma','no-cache')
        super().end_headers()
server=ThreadingHTTPServer(('127.0.0.1',0),partial(NoCache,directory=str(root)))
url='http://127.0.0.1:{}/GRIFHII_TESTE_14_V4_CONFIRMADO.html?v=20261102-v4'.format(server.server_address[1])
print('\nGRIFHII TESTE 14 V4 — SERVIDOR NOVO SEM CACHE',flush=True)
print('Pasta: {}'.format(root),flush=True)
print('Abra este endereço caso o Chrome não abra automaticamente:\n{}\n'.format(url),flush=True)
webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
