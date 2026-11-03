#!/usr/bin/env python3
"""GRIFHII Etapa 16: servidor local sem cache; usa porta livre."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os, webbrowser
root=Path(__file__).resolve().parent
os.chdir(root)
class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control','no-store, no-cache, must-revalidate, max-age=0')
        super().end_headers()
server=ThreadingHTTPServer(('127.0.0.1',0),lambda *args,**kwargs:NoCache(*args,directory=str(root),**kwargs))
base='http://127.0.0.1:{}'.format(server.server_address[1])
print('GRIFHII — ETAPA 16 — CARRINHO + CHECKOUT SEGURO',flush=True)
print('CONFIGURAR: '+base+'/CONFIGURAR_SHOPIFY_ETAPA16.html',flush=True)
print('LOJA: '+base+'/index.html',flush=True)
print('A Shopify será acessada apenas para produtos/carrinho; nenhuma compra é executada.',flush=True)
webbrowser.open(base+'/CONFIGURAR_SHOPIFY_ETAPA16.html')
try:server.serve_forever()
except KeyboardInterrupt:pass
finally:server.server_close()
