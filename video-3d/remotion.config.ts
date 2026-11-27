import { Config } from "@remotion/cli/config";
import { existsSync } from "node:fs";

Config.setVideoImageFormat("jpeg");
// Necessário para WebGL (Three.js) ao renderizar sem GPU
Config.setChromiumOpenGlRenderer("angle");

// No ambiente em nuvem, usa o Chromium já instalado.
// No seu computador, o Remotion baixa o navegador sozinho.
const chromiumLocal = "/opt/pw-browsers/chromium";
if (existsSync(chromiumLocal)) {
  Config.setBrowserExecutable(chromiumLocal);
}
