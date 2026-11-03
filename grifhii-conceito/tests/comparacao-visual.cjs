/* Comparação visual antes/depois: baseline (pacote original) x dist final.
 * Uso: node tests/comparacao-visual.cjs <urlBaseline> <urlFinal> <pastaSaida>
 * Congela animações/carrosséis e bloqueia a Shopify para comparar somente o layout. */
const {chromium} = require('playwright');
const fs = require('fs'); const path = require('path');
const {PNG} = require('pngjs'); const pixelmatch = require('pixelmatch');
const [,, A, B, OUT] = process.argv;
const pages = [
  ['home', 'index.html', ''], ['produtos', 'produtos.html', 'produtos'], ['marca-lacoste', 'produtos.html?marca=lacoste', 'produtos?marca=lacoste'],
  ['peca', 'peca.html?slug=lacoste-signature-script', 'peca-lacoste-signature-script'],
];
const freeze = `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}`;
(async () => {
  fs.mkdirSync(OUT, {recursive: true});
  const browser = await chromium.launch();
  const rows = [];
  for (const vp of [{n: 'desktop', width: 1366, height: 900}, {n: 'mobile', width: 375, height: 740}]) {
    for (const [name, pa, pb] of pages) {
      const shots = [];
      for (const url of [A + pa, B + pb]) {
        const ctx = await browser.newContext({viewport: vp, reducedMotion: 'reduce'});
        const page = await ctx.newPage();
        await page.route('https://grifhiiconceito.myshopify.com/**', r => r.abort());
        await page.route('https://www.google.com/**', r => r.abort());
        await page.addInitScript(() => { Math.random = () => 0.42; });
        await page.goto(url, {waitUntil: 'load'});
        await page.addStyleTag({content: freeze});
        await page.evaluate(() => { window.GRIFHII_CAMPAIGN_CAROUSEL?.pause?.(); });
        await page.waitForTimeout(1800);
        shots.push(PNG.sync.read(await page.screenshot()));
        await ctx.close();
      }
      const [a, b] = shots; const {width, height} = a;
      const diff = new PNG({width, height});
      const n = (a.height === b.height && a.width === b.width) ? pixelmatch(a.data, b.data, diff.data, width, height, {threshold: 0.1}) : -1;
      const pct = n < 0 ? 'tamanho diferente' : (100 * n / (width * height)).toFixed(3) + '%';
      fs.writeFileSync(path.join(OUT, `${vp.n}-${name}-antes.png`), PNG.sync.write(a));
      fs.writeFileSync(path.join(OUT, `${vp.n}-${name}-depois.png`), PNG.sync.write(b));
      if (n >= 0) fs.writeFileSync(path.join(OUT, `${vp.n}-${name}-diff.png`), PNG.sync.write(diff));
      rows.push(`| ${vp.n} | ${name} | ${pct} |`);
      console.log(vp.n, name, pct);
    }
  }
  fs.writeFileSync(path.join(OUT, 'resultado.md'), `| Viewport | Página | Pixels diferentes (1ª dobra) |\n|---|---|---|\n${rows.join('\n')}\n`);
  await browser.close();
})();
