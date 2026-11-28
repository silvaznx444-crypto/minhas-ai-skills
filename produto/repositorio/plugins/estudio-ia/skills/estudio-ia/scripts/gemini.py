"""Cliente mínimo da Gemini API (texto, imagem, entendimento de vídeo e Veo).

A chave vem de GEMINI_API_KEY / GOOGLE_API_KEY. Se nenhuma existir, o header
x-goog-api-key vai com um valor fictício: num ambiente cloud do Claude Code com a
chave salva em "Network secrets", o proxy substitui pelo valor real.
"""
from __future__ import annotations

import base64
import json
import mimetypes
import os
import re
import sys
import time
from pathlib import Path

import requests

BASE = "https://generativelanguage.googleapis.com/v1beta"


class GeminiError(RuntimeError):
    pass


def _log(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def _version(name: str) -> float:
    m = re.search(r"-(\d+(?:\.\d+)?)", name)
    return float(m.group(1)) if m else 0.0


class Gemini:
    def __init__(self, key: str | None = None):
        key = key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        self.s = requests.Session()
        self.s.headers["x-goog-api-key"] = key or "injetada-pelo-proxy"
        self.s.headers["Content-Type"] = "application/json"
        self._models: list[dict] | None = None

    # ------------------------------------------------------------------ base
    def _req(self, method: str, url: str, **kw) -> dict:
        for tentativa in range(5):
            r = self.s.request(method, url, timeout=kw.pop("timeout", 300), **kw)
            if r.status_code in (429, 500, 502, 503, 504):
                espera = 10 * (tentativa + 1)
                _log(f"  [gemini] HTTP {r.status_code}, tentando de novo em {espera}s...")
                time.sleep(espera)
                continue
            if r.status_code >= 400:
                raise GeminiError(f"HTTP {r.status_code} em {url.split('?')[0]}:\n{r.text[:2000]}")
            return r.json()
        raise GeminiError(f"Falhou após várias tentativas: {url}")

    def _url(self, model: str, metodo: str) -> str:
        return f"{BASE}/models/{model}:{metodo}"

    # --------------------------------------------------------------- modelos
    def models(self) -> list[dict]:
        if self._models is None:
            out, token = [], None
            while True:
                params = {"pageSize": 1000}
                if token:
                    params["pageToken"] = token
                d = self._req("GET", f"{BASE}/models", params=params)
                out += d.get("models", [])
                token = d.get("nextPageToken")
                if not token:
                    break
            self._models = out
        return self._models

    def pick(self, kind: str, preferido: str | None = None, rapido: bool = False) -> str:
        """Escolhe automaticamente o modelo mais novo disponível para a sua chave."""
        if preferido and preferido != "auto":
            return preferido.removeprefix("models/")
        names = [m["name"].removeprefix("models/") for m in self.models()]
        meth = {m["name"].removeprefix("models/"): m.get("supportedGenerationMethods", []) for m in self.models()}
        if kind == "veo":
            c = [n for n in names if n.startswith("veo-") and "predictLongRunning" in meth[n]]
            c = [n for n in c if ("fast" in n) == rapido] or c
            key = lambda n: (_version(n), "preview" not in n)
        elif kind == "image":
            c = [n for n in names if n.startswith("gemini") and "image" in n and "generateContent" in meth[n]]
            key = lambda n: (_version(n), "pro" in n, "preview" not in n)
        else:  # texto
            bad = ("image", "tts", "audio", "live", "embedding", "thinking", "lite", "exp", "computer")
            c = [n for n in names if n.startswith("gemini-") and "generateContent" in meth[n]
                 and not any(b in n for b in bad)]
            key = lambda n: (_version(n), "pro" in n, "preview" not in n, "latest" not in n)
        if not c:
            raise GeminiError(f"Nenhum modelo do tipo '{kind}' disponível para esta chave.")
        return sorted(c, key=key)[-1]

    # ----------------------------------------------------------------- texto
    def text(self, prompt: str, model: str, parts: list | None = None, json_out: bool = False,
             config: dict | None = None):
        body = {"contents": [{"role": "user", "parts": (parts or []) + [{"text": prompt}]}]}
        cfg = dict(config or {})
        if json_out:
            cfg["responseMimeType"] = "application/json"
        if cfg:
            body["generationConfig"] = cfg
        d = self._req("POST", self._url(model, "generateContent"), json=body)
        txt = "".join(p.get("text", "") for c in d.get("candidates", [])[:1]
                      for p in c.get("content", {}).get("parts", []))
        if not txt:
            raise GeminiError(f"Resposta vazia: {json.dumps(d)[:1000]}")
        if json_out:
            txt = re.sub(r"^```(?:json)?|```$", "", txt.strip(), flags=re.M).strip()
            return json.loads(txt)
        return txt

    @staticmethod
    def inline(path: str | Path) -> dict:
        p = Path(path)
        mime = mimetypes.guess_type(p.name)[0] or "application/octet-stream"
        return {"inlineData": {"mimeType": mime, "data": base64.b64encode(p.read_bytes()).decode()}}

    # ---------------------------------------------------------------- imagem
    def image(self, prompt: str, out: Path, model: str, refs: list[Path] = (), aspect: str = "9:16") -> Path:
        parts = [self.inline(r) for r in refs] + [{"text": prompt}]
        body = {
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": {"responseModalities": ["TEXT", "IMAGE"],
                                 "imageConfig": {"aspectRatio": aspect}},
        }
        d = self._req("POST", self._url(model, "generateContent"), json=body)
        for c in d.get("candidates", []):
            for p in c.get("content", {}).get("parts", []):
                if "inlineData" in p:
                    out.parent.mkdir(parents=True, exist_ok=True)
                    out.write_bytes(base64.b64decode(p["inlineData"]["data"]))
                    return out
        raise GeminiError(f"O modelo não devolveu imagem: {json.dumps(d)[:1500]}")

    # ------------------------------------------------------------------- veo
    def veo(self, prompt: str, out: Path, model: str, image: Path | None = None,
            aspect: str = "9:16", resolution: str | None = "1080p", duration: int = 8,
            negative: str | None = None, timeout_s: int = 900) -> Path:
        inst: dict = {"prompt": prompt}
        if image:
            img = self.inline(image)["inlineData"]
            inst["image"] = {"bytesBase64Encoded": img["data"], "mimeType": img["mimeType"]}
        params: dict = {"aspectRatio": aspect, "durationSeconds": duration}
        if resolution:
            params["resolution"] = resolution
        if negative:
            params["negativePrompt"] = negative
        if image:
            params["personGeneration"] = "allow_adult"

        url = f"{BASE}/models/{model}:predictLongRunning"
        try:
            op = self._req("POST", url, json={"instances": [inst], "parameters": params})
        except GeminiError as e:
            # Alguns modelos não aceitam todos os parâmetros: tenta de novo sem os opcionais.
            if "HTTP 400" not in str(e):
                raise
            _log(f"  [veo] parâmetros recusados, tentando sem resolution/personGeneration: {str(e)[:300]}")
            params.pop("resolution", None)
            params.pop("personGeneration", None)
            op = self._req("POST", url, json={"instances": [inst], "parameters": params})

        name, t0 = op["name"], time.time()
        while not op.get("done"):
            if time.time() - t0 > timeout_s:
                raise GeminiError(f"Veo demorou mais de {timeout_s}s ({name})")
            time.sleep(10)
            op = self._req("GET", f"{BASE}/{name}")
            _log(f"  [veo] gerando... {int(time.time() - t0)}s")
        if "error" in op:
            raise GeminiError(f"Veo falhou: {op['error']}")
        resp = op.get("response", {}).get("generateVideoResponse", {})
        samples = resp.get("generatedSamples") or []
        if not samples:
            raise GeminiError("Veo não devolveu vídeo (provável filtro de segurança): "
                              + json.dumps(resp)[:1500])
        uri = samples[0]["video"]["uri"]
        r = self.s.get(uri, timeout=600, allow_redirects=True, stream=True)
        if r.status_code >= 400:
            raise GeminiError(f"Download do vídeo falhou: HTTP {r.status_code} {r.text[:500]}")
        out.parent.mkdir(parents=True, exist_ok=True)
        with open(out, "wb") as f:
            for chunk in r.iter_content(1 << 20):
                f.write(chunk)
        return out
