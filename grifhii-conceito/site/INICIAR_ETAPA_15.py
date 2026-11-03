#!/usr/bin/env python3
"""Inicia GRIFHII Etapa 15 em porta livre (evita cache/versão antiga)."""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os, webbrowser
root=Path(__file__).resolve().parent
os.chdir(root)
class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control','no-store, no-cache, must-revalidate, max-age=0')
        super().end_headers()
server=ThreadingHTTPServer(('127.0.0.1',0),partial(NoCache,directory=str(root)))
base='http://127.0.0.1:{}'.format(server.server_address[1])
print('\nGRIFHII ETAPA 15 — SITE COMPLETO — PORTA LIVRE',flush=True)
print('INICIO: '+base+'/index.html',flush=True)
print('CONFIGURAR TOKEN: '+base+'/CONFIGURAR_SHOPIFY_ETAPA15.html',flush=True)
print('VITRINE: '+base+'/produtos.html',flush=True)
print('TESTE DINAMICO: '+base+'/peca.html?slug=shopify-teste-grifhii-camiseta-nova',flush=True)
webbrowser.open(base+'/CONFIGURAR_SHOPIFY_ETAPA15.html')
try: server.serve_forever()
except KeyboardInterrupt: pass
finally:server.server_close()
