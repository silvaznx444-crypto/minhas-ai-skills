import { useMemo, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon, Stamp, Ticket } from '../components/ui';
import { useThemedPage } from '../hooks/useThemedPage';
import '../styles/store.css';

const AREAS = ['Salão', 'Varanda'];
const WD = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
const LONG = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

/** Horários de 30 em 30 min dentro do funcionamento do dia, parando 1h antes de fechar. */
function slots(from: string, to: string) {
  const [fh, fm] = from.split(':').map(Number);
  const [th, tm] = to.split(':').map(Number);
  const end = (th * 60 + tm || 24 * 60) - 60;
  const out: string[] = [];
  for (let t = fh * 60 + fm; t <= end; t += 30) out.push(`${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
  return out;
}

export default function Reserva() {
  const [params] = useSearchParams();
  const mesa = params.get('mesa');
  const { published: c, vars } = useThemedPage();
  const days = useMemo(() => {
    const t = new Date();
    return Array.from({ length: 7 }, (_, i) => new Date(t.getFullYear(), t.getMonth(), t.getDate() + i));
  }, []);
  const isOpen = (d: Date) => c.content.hours[d.getDay()]?.open;
  const [day, setDay] = useState(() => Math.max(0, days.findIndex(isOpen)));
  const [time, setTime] = useState<string | null>(null);
  const [people, setPeople] = useState(2);
  const [area, setArea] = useState(0);
  const [done, setDone] = useState(false);

  const back = `/r/${c.slug}${mesa ? `?mesa=${mesa}` : ''}`;
  const h = c.content.hours[days[day].getDay()];
  const times = h?.open ? slots(h.from, h.to) : [];
  const now = new Date();
  const past = (t: string) => {
    if (day !== 0) return false;
    const [hh, mm] = t.split(':').map(Number);
    return hh * 60 + mm <= now.getHours() * 60 + now.getMinutes() + 30;
  };
  const summary = `${LONG.format(days[day])} · ${time ?? '--:--'} · ${people} ${people === 1 ? 'pessoa' : 'pessoas'} · ${AREAS[area].toLowerCase()}`;

  if (done) {
    return (
      <main className="app" style={vars}>
        <div className="flow">
          <div className="done">
            <Stamp slam>Reserva confirmada</Stamp>
            <h1 className="sf-display flow__title">Até lá!</h1>
            <p className="lead">{summary}. A mesa fica guardada por 15 min após o horário.</p>
            <Link to={back} viewTransition className="btn">Ver cardápio</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="app" style={vars}>
      <div className="flow">
        <div className="flow__top">
          <Link to={back} viewTransition className="icon-btn" aria-label="Voltar ao cardápio">{Icon.back}</Link>
          <span className="flow__name">{c.name}</span>
        </div>
        <h1 className="sf-display flow__title">Reserve sua mesa</h1>

        <div>
          <p className="label">Dia</p>
          <div className="days">
            {days.map((d, i) => (
              <button key={i} type="button" className="day" aria-pressed={day === i} disabled={!isOpen(d)} onClick={() => { setDay(i); setTime(null); }} aria-label={LONG.format(d) + (isOpen(d) ? '' : ', fechado')}>
                <small>{WD.format(d).replace('.', '')}</small>
                <b>{d.getDate()}</b>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="label">Horário</p>
          {times.length ? (
            <div className="times">
              {times.map((t) => (
                <button key={t} type="button" className="time" aria-pressed={time === t} disabled={past(t)} onClick={() => setTime(t)}>{t}</button>
              ))}
            </div>
          ) : (
            <p className="flow-note">Fechado neste dia.</p>
          )}
        </div>

        <div className="pair">
          <div>
            <p className="label">Pessoas</p>
            <div className="counter">
              <button type="button" className="icon-btn" aria-label="Menos pessoas" onClick={() => setPeople((p) => Math.max(1, p - 1))}>{Icon.minus}</button>
              <b key={people} aria-live="polite">{people}</b>
              <button type="button" className="icon-btn" aria-label="Mais pessoas" onClick={() => setPeople((p) => Math.min(12, p + 1))}>{Icon.plus}</button>
            </div>
          </div>
          <div>
            <p className="label">Área</p>
            <div className="seg" role="radiogroup" aria-label="Área" style={{ '--n': 2, '--i': area } as CSSProperties}>
              <span className="seg__thumb" aria-hidden="true" />
              {AREAS.map((a, i) => (
                <button key={a} type="button" role="radio" aria-checked={area === i} onClick={() => setArea(i)}>{a}</button>
              ))}
            </div>
          </div>
        </div>

        <Ticket className="receipt" style={{ marginTop: 'auto' }}>
          <p className="receipt__head">{summary}</p>
          <p className="receipt__sub">Mesa guardada por 15 min. Lembrete no WhatsApp 2h antes.</p>
          <button type="button" className="btn btn--block" disabled={!time} onClick={() => setDone(true)}>
            {time ? 'Confirmar reserva' : 'Escolha um horário'}
          </button>
        </Ticket>
      </div>
    </main>
  );
}
