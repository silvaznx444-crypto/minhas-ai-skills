"""Mesmo cliente, mas pelo Vertex AI (Google Cloud) — usa os créditos grátis da conta nova.

Autenticação (em ordem):
  1. VERTEX_SA_JSON  = conteúdo do JSON da service account (texto puro ou base64)
  2. GOOGLE_APPLICATION_CREDENTIALS = caminho do JSON, ou `gcloud auth application-default login`
Projeto: GOOGLE_CLOUD_PROJECT (ou o project_id do JSON). Região: GOOGLE_CLOUD_LOCATION (padrão us-central1).
"""
from __future__ import annotations

import base64
import json
import os
import time
from pathlib import Path

import requests

from gemini import Gemini, GeminiError, _log

CANDIDATOS = {
    "veo": ["veo-3.1-generate-001", "veo-3.1-generate-preview", "veo-3.0-generate-001"],
    "veo_fast": ["veo-3.1-fast-generate-001", "veo-3.1-fast-generate-preview", "veo-3.0-fast-generate-001"],
    "image": ["gemini-3-pro-image", "gemini-3-pro-image-preview", "gemini-3.1-flash-image", "gemini-2.5-flash-image"],
    "texto": ["gemini-3.5-pro", "gemini-3.5-flash", "gemini-3.1-pro", "gemini-3.1-pro-preview", "gemini-3-pro",
              "gemini-3-flash-preview", "gemini-2.5-pro", "gemini-2.5-flash"],
}


def configurado() -> bool:
    return any(os.environ.get(k) for k in ("VERTEX_SA_JSON", "GOOGLE_APPLICATION_CREDENTIALS",
                                           "GOOGLE_CLOUD_PROJECT"))


class Vertex(Gemini):
    def __init__(self):
        super().__init__(key="nao-usada")
        del self.s.headers["x-goog-api-key"]
        import google.auth
        import google.auth.transport.requests
        from google.oauth2 import service_account

        scopes = ["https://www.googleapis.com/auth/cloud-platform"]
        bruto = os.environ.get("VERTEX_SA_JSON", "").strip()
        projeto = None
        if bruto:
            if not bruto.startswith("{"):
                bruto = base64.b64decode(bruto).decode()
            info = json.loads(bruto)
            self.creds = service_account.Credentials.from_service_account_info(info, scopes=scopes)
            projeto = info.get("project_id")
        else:
            self.creds, projeto = google.auth.default(scopes=scopes)
        self.projeto = os.environ.get("GOOGLE_CLOUD_PROJECT") or projeto
        if not self.projeto:
            raise GeminiError("Defina GOOGLE_CLOUD_PROJECT com o ID do seu projeto do Google Cloud.")
        self.local = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
        self._authreq = google.auth.transport.requests.Request()
        self._escolhidos: dict[str, str] = {}

    def _req(self, method, url, **kw):
        if not self.creds.valid:
            try:
                self.creds.refresh(self._authreq)
            except Exception as e:  # credencial errada, conta apagada, sem rede...
                raise GeminiError(f"Falha no login do Google Cloud: {e}") from e
        self.s.headers["Authorization"] = f"Bearer {self.creds.token}"
        return super()._req(method, url, **kw)

    def _host(self, local: str) -> str:
        return "aiplatform.googleapis.com" if local == "global" else f"{local}-aiplatform.googleapis.com"

    def _local_do(self, model: str) -> str:
        # Modelos Gemini novos só existem no endpoint global; o Veo fica na região.
        return "global" if model.startswith("gemini") else self.local

    def _url(self, model: str, metodo: str) -> str:
        loc = self._local_do(model)
        return (f"https://{self._host(loc)}/v1/projects/{self.projeto}/locations/{loc}"
                f"/publishers/google/models/{model}:{metodo}")

    # ------------------------------------------------------------- modelos
    def pick(self, kind: str, preferido: str | None = None, rapido: bool = False) -> str:
        if preferido and preferido != "auto":
            return preferido
        chave = "veo_fast" if kind == "veo" and rapido else kind
        if chave in self._escolhidos:
            return self._escolhidos[chave]
        for m in CANDIDATOS[chave]:
            try:
                if m.startswith("gemini"):
                    # countTokens é grátis e confirma que ESTE projeto tem acesso ao modelo.
                    self._req("POST", self._url(m, "countTokens"), timeout=30,
                              json={"contents": [{"role": "user", "parts": [{"text": "oi"}]}]})
                else:
                    self._req("GET", f"https://{self._host(self.local)}/v1beta1/publishers/google/models/{m}",
                              timeout=30)
            except GeminiError:
                continue
            self._escolhidos[chave] = m
            return m
        raise GeminiError(f"Nenhum modelo '{kind}' disponível no Vertex: {CANDIDATOS[chave]}. "
                          "Confira se a API Vertex AI está ativada no projeto.")

    # ----------------------------------------------------------------- veo
    def veo(self, prompt: str, out: Path, model: str, image: Path | None = None,
            aspect: str = "9:16", resolution: str | None = "1080p", duration: int = 8,
            negative: str | None = None, timeout_s: int = 900) -> Path:
        inst: dict = {"prompt": prompt}
        if image:
            img = self.inline(image)["inlineData"]
            inst["image"] = {"bytesBase64Encoded": img["data"], "mimeType": img["mimeType"]}
        params: dict = {"aspectRatio": aspect, "durationSeconds": duration, "sampleCount": 1,
                        "generateAudio": True, "personGeneration": "allow_adult"}
        if resolution:
            params["resolution"] = resolution
        if negative:
            params["negativePrompt"] = negative
        url = self._url(model, "predictLongRunning")
        try:
            op = self._req("POST", url, json={"instances": [inst], "parameters": params})
        except GeminiError as e:
            if "HTTP 400" not in str(e) or "resolution" not in params:
                raise
            _log(f"  [veo] parâmetros recusados, tentando sem resolution: {str(e)[:300]}")
            params.pop("resolution")
            op = self._req("POST", url, json={"instances": [inst], "parameters": params})

        name, t0 = op["name"], time.time()
        while not op.get("done"):
            if time.time() - t0 > timeout_s:
                raise GeminiError(f"Veo demorou mais de {timeout_s}s ({name})")
            time.sleep(10)
            op = self._req("POST", self._url(model, "fetchPredictOperation"), json={"operationName": name})
            _log(f"  [veo] gerando... {int(time.time() - t0)}s")
        if "error" in op:
            raise GeminiError(f"Veo falhou: {op['error']}")
        resp = op.get("response", {})
        videos = resp.get("videos") or []
        if not videos:
            raise GeminiError("Veo não devolveu vídeo (provável filtro de segurança): "
                              + json.dumps(resp)[:1500])
        v = videos[0]
        out.parent.mkdir(parents=True, exist_ok=True)
        if v.get("bytesBase64Encoded"):
            out.write_bytes(base64.b64decode(v["bytesBase64Encoded"]))
        else:
            raise GeminiError(f"Veo devolveu só um link do Cloud Storage: {v.get('gcsUri')}")
        return out
