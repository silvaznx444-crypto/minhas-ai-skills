import { useEffect, useRef, useState } from 'react';
import { reducedMotion } from '../lib/motion';

/*
 * Pedido acontecendo no mapa: recebido → em preparo → saiu para entrega → entregue.
 * O entregador acelera, freia antes das curvas e chega devagar; a velocidade é
 * simulada (não é uma animação de duração fixa), por isso o movimento parece real.
 * O laço só roda com o componente visível e a aba ativa.
 */

const ROUTE = 'M92 330 H178 Q196 330 196 312 V246 Q196 228 214 228 H318 Q336 228 336 210 V140 Q336 122 354 122 H430';
const STEPS = ['Pedido recebido', 'Em preparo', 'Saiu para entrega', 'Entregue'];
const RECEIVED = 2.4; // s
const COOKING = 2.6; // s
const HOLD = 3.2; // s parado em "entregue"
const VMAX = 120; // px/s em reta
const VMIN = 34; // px/s na curva

type Sim = { phase: number; t: number; s: number; v: number };

export function HeroDelivery() {
  const root = useRef<HTMLDivElement>(null);
  const path = useRef<SVGPathElement>(null);
  const done = useRef<SVGPathElement>(null);
  const rider = useRef<SVGGElement>(null);
  const eta = useRef<HTMLSpanElement>(null);
  const [phase, setPhase] = useState(reducedMotion ? 2 : 0);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const p = path.current!;
    const len = p.getTotalLength();
    // velocidade-alvo ao longo da rota: mais baixa perto das curvas (olhando à frente para frear antes)
    const N = 240;
    const ang: number[] = [];
    for (let i = 0; i <= N; i++) {
      const a = p.getPointAtLength((i / N) * len);
      const b = p.getPointAtLength(Math.min(len, ((i + 1) / N) * len));
      ang.push(Math.atan2(b.y - a.y, b.x - a.x));
    }
    const turn = ang.map((a, i) => (i ? Math.abs(Math.atan2(Math.sin(a - ang[i - 1]), Math.cos(a - ang[i - 1]))) : 0));
    const target = ang.map((_, i) => {
      let t = 0;
      for (let k = i; k < Math.min(N, i + 18); k++) t = Math.max(t, turn[k]);
      const end = Math.min(1, ((N - i) / N) * len / 70); // chega devagar
      return Math.max(VMIN * 0.6, (VMAX - (VMAX - VMIN) * Math.min(1, t * 9)) * Math.max(0.25, end));
    });
    const speedAt = (s: number) => target[Math.min(N, Math.round((s / len) * N))];

    const place = (s: number) => {
      const a = p.getPointAtLength(s);
      const b = p.getPointAtLength(Math.min(len, s + 2));
      const deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      rider.current?.setAttribute('transform', `translate(${a.x.toFixed(1)} ${a.y.toFixed(1)}) rotate(${deg.toFixed(1)})`);
      done.current?.setAttribute('stroke-dashoffset', String(len - s));
      if (eta.current) eta.current.textContent = s >= len - 0.5 ? 'Entregue' : `Chega em ${Math.max(1, Math.ceil(((len - s) / len) * 14))} min`;
    };
    done.current?.setAttribute('stroke-dasharray', String(len));

    if (reducedMotion) {
      place(len * 0.55);
      return;
    }

    const sim: Sim = { phase: 0, t: 0, s: 0, v: 0 };
    place(0);
    let raf = 0;
    let last = 0;
    let visible = true;

    const frame = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      sim.t += dt;
      if (sim.phase === 0 && sim.t > RECEIVED) go(1);
      else if (sim.phase === 1 && sim.t > COOKING) go(2);
      else if (sim.phase === 2) {
        const tv = speedAt(sim.s);
        // aceleração e frenagem suaves (aproximação exponencial da velocidade-alvo)
        sim.v += (tv - sim.v) * Math.min(1, dt * (tv > sim.v ? 1.6 : 4));
        sim.s = Math.min(len, sim.s + sim.v * dt);
        place(sim.s);
        if (sim.s >= len) go(3);
      } else if (sim.phase === 3 && sim.t > HOLD) {
        sim.s = 0;
        sim.v = 0;
        place(0);
        setCycle((c) => c + 1);
        go(0);
      }
      if (visible) raf = requestAnimationFrame(frame);
    };
    const go = (ph: number) => {
      sim.phase = ph;
      sim.t = 0;
      setPhase(ph);
    };
    const start = () => {
      if (!raf && visible) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting && !document.hidden;
      if (visible) start();
    });
    io.observe(root.current!);
    const onVis = () => {
      visible = !document.hidden;
      if (visible) start();
    };
    document.addEventListener('visibilitychange', onVis);
    start();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return (
    <div ref={root} className="hd" data-phase={phase} aria-label="Exemplo de pedido de entrega sendo acompanhado no mapa" role="img">
      <svg className="hd__map" viewBox="0 0 520 420" aria-hidden="true">
        <rect width="520" height="420" className="hd__ground" />
        <path className="hd__park" d="M372 262 h120 v120 h-120 z" />
        <g className="hd__blocks">
          {[
            [24, 24, 150, 84], [196, 24, 120, 84], [338, 24, 158, 76],
            [24, 130, 150, 76], [218, 130, 96, 76], [358, 144, 138, 96],
            [24, 228, 150, 82], [218, 250, 96, 60], [24, 352, 150, 46], [218, 332, 132, 66],
          ].map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} rx="10" />)}
        </g>
        <path ref={path} d={ROUTE} className="hd__route" />
        <path ref={done} d={ROUTE} className="hd__done" />
        <g className="hd__shop" transform="translate(92 330)">
          <circle r="15" />
          <path d="M-6 -2 h12 l-1.5 8 h-9 z M-4 -2 v-3 a4 4 0 0 1 8 0 v3" />
        </g>
        <g className="hd__home" transform="translate(430 122)">
          <circle r="15" className="hd__pulse" />
          <circle r="15" />
          <path d="M-6 1 L0 -5 L6 1 V7 H-6 Z" />
        </g>
        <g ref={rider} className="hd__rider" transform="translate(92 330)">
          <circle r="11" />
          <path d="M-3 -4 L4 0 L-3 4 Z" />
        </g>
      </svg>

      <div className="hd__card">
        <div className="hd__head">
          <div>
            <b>Pedido 128</b>
            <span>Entrega · 3,4 km</span>
          </div>
          <span ref={eta} className="hd__eta">Chega em 14 min</span>
        </div>
        <ol className="hd__steps">
          {STEPS.map((s, i) => (
            <li key={s} className={i < phase ? 'is-done' : i === phase ? 'is-now' : ''}>
              <i aria-hidden="true" />
              {s}
            </li>
          ))}
        </ol>
      </div>

      <div className="hd__printer" aria-hidden="true">
        <div className="hd__slot" />
        <div className="hd__paper" key={cycle}>
          <b>PEDIDO 128</b>
          <span>ENTREGA</span>
          <hr />
          <span>2x Margherita</span>
          <span>1x Soda italiana</span>
          <hr />
          <b>TOTAL R$ 119,10</b>
        </div>
      </div>
    </div>
  );
}
