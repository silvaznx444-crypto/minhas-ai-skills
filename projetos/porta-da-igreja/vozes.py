#!/usr/bin/env python3
"""Gera uma faixa WAV por fala (Gemini TTS no Vertex). Pula as que já existem."""
import base64, json, subprocess, sys, wave
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI.parents[1] / ".claude/skills/video-ia/scripts"))
import vertex  # noqa: E402

MODELO = "gemini-2.5-pro-tts"


def main():
    rot = json.loads((AQUI / "roteiro.json").read_text())
    out = AQUI / "vozes"; out.mkdir(exist_ok=True)
    v = vertex.Vertex()
    refazer = set(sys.argv[1:])
    for i, p in enumerate(rot["planos"]):
        for j, (quem, texto) in enumerate(p.get("falas", [])):
            nome = f"p{i:02d}_{j}"
            wav = out / f"{nome}.wav"
            if wav.exists() and nome not in refazer:
                continue
            vz = rot["vozes"][quem]
            prompt = f"Fale como um ator dublando um desenho animado: {vz['estilo']}. Diga exatamente: {texto}"
            body = {"contents": [{"role": "user", "parts": [{"text": prompt}]}],
                    "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {
                        "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": vz["voz"]}}}}}
            d = v._req("POST", v._url(MODELO, "generateContent"), json=body, timeout=180)
            pcm = base64.b64decode(d["candidates"][0]["content"]["parts"][0]["inlineData"]["data"])
            bruto = out / f"{nome}.raw.wav"
            with wave.open(str(bruto), "wb") as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
            filtro = "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse"
            if vz.get("telefone"):
                filtro += ",highpass=f=350,lowpass=f=3200,acrusher=bits=10:mix=0.25,volume=1.6"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(bruto), "-af", filtro, "-ar", "48000", "-ac", "1",
                            str(wav)], check=True)
            bruto.unlink()
            print("ok", nome, quem, texto, flush=True)


if __name__ == "__main__":
    main()
