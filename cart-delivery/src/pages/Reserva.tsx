import { useMemo, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon, Stamp, Ticket } from '../components/ui';
import { RESTAURANT } from '../lib/data';
import { useStore } from '../lib/store';
import '../styles/store.css';

const TIMES = ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30'];
const AREAS = ['Salão', 'Varanda'];
const WD = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
const LONG = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

// Demo: casa fechada às segundas. Em produção, disponibilidade vem da API.
const closed = (d: Date) => d.getDay() === 1;

export default function Reserva() {
  const [params] = useSearchParams();
  const mesa = params.get('mesa');
  const { config } = useStore();
  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + i));
  }, []);
  const [day, setDay] = useState(() => days.findIndex((d) => !closed(d)));
  const [time, setTime] = useState<string | null>(null);
  const [people, setPeople] = useState(2);
  const [area, setArea] = useState(0);
  const [done, setDone] = useState(false);

  const back = `/r/${RESTAURANT.slug}${mesa ? `?mesa=${mesa}` : ''}`;
  const isToday = day === 0;
  const now = new Date();
  const past = (t: string) => {
    if (!isToday) return false;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m <= now.getHours() * 60 + now.getMinutes() + 30;
  };
  const summary = `${LONG.format(days[day])} · ${time ?? '--:--'} · ${people} ${people === 1 ? 'pessoa' : 'pessoas'} · ${AREAS[area].toLowerCase()}`;

  if (done) {
    return (
      <main className="app">
        <div className="flow">
          <div className="done">
            <Stamp tilt={-7} slam>RESERVADO</Stamp>
            <h1 className="display flow__title">Até lá!</h1>
            <p className="lead">{summary}. Mesa segurada por 15 min após o horário.</p>
            <Link to={back} viewTransition className="btn">Ver cardápio</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="app">
      <div className="flow">
        <div className="flow__top">
          <Link to={back} viewTransition className="icon-btn" aria-label="Voltar ao cardápio">{Icon.back}</Link>
          <span className="mono" style={{ fontSize: 14 }}>{config.name}</span>
        </div>
        <h1 className="display flow__title">
          Reserve
          <br />
          sua mesa
        </h1>

        <div>
          <p className="label">Dia</p>
          <div className="days">
            {days.map((d, i) => (
              <button key={i} type="button" className="day" aria-pressed={day === i} disabled={closed(d)} onClick={() => { setDay(i); setTime(null); }} aria-label={LONG.format(d) + (closed(d) ? ', fechado' : '')}>
                <small>{WD.format(d).replace('.', '')}</small>
                <b>{d.getDate()}</b>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="label">Horário</p>
          <div className="times" style={{ marginTop: 10 }}>
            {TIMES.map((t) => (
              <button key={t} type="button" className="time" aria-pressed={time === t} disabled={past(t)} onClick={() => setTime(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="pair">
          <div>
            <p className="mono" style={{ margin: 0, fontSize: 14 }}>Pessoas</p>
            <div className="counter">
              <button type="button" className="icon-btn" aria-label="Menos pessoas" onClick={() => setPeople((p) => Math.max(1, p - 1))}>{Icon.minus}</button>
              <b key={people} className="qty__n" aria-live="polite">{people}</b>
              <button type="button" className="icon-btn icon-btn--solid" aria-label="Mais pessoas" onClick={() => setPeople((p) => Math.min(12, p + 1))}>{Icon.plus}</button>
            </div>
          </div>
          <div>
            <p className="mono" style={{ margin: 0, fontSize: 14 }}>Área</p>
            <div className="seg" role="radiogroup" aria-label="Área" style={{ '--n': 2, '--i': area } as CSSProperties}>
              <span className="seg__thumb" aria-hidden="true" />
              {AREAS.map((a, i) => (
                <button key={a} type="button" role="radio" aria-checked={area === i} onClick={() => setArea(i)}>{a}</button>
              ))}
            </div>
          </div>
        </div>

        <Ticket tilt={1.2} taped tape={42} className="receipt" style={{ marginTop: 'auto' }}>
          <p className="mono">{summary}</p>
          <p style={{ fontSize: 13 }}>Mesa segurada por 15 min. Lembrete no WhatsApp 2h antes.</p>
          <button type="button" className="btn btn--block" disabled={!time || day < 0} onClick={() => setDone(true)}>
            {time ? 'Confirmar reserva' : 'Escolha um horário'}
          </button>
        </Ticket>
      </div>
    </main>
  );
}
