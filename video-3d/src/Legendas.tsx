import { createTikTokStyleCaptions, type Caption } from "@remotion/captions";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";

// Legendas de exemplo (tempos em milissegundos).
// Também é possível gerá-las a partir do áudio com @remotion/install-whisper-cpp.
const legendas: Caption[] = [
  { text: "Olá!", startMs: 0, endMs: 800, timestampMs: 400, confidence: 1 },
  { text: " Este", startMs: 800, endMs: 1300, timestampMs: 1000, confidence: 1 },
  { text: " é", startMs: 1300, endMs: 1600, timestampMs: 1450, confidence: 1 },
  { text: " um", startMs: 1600, endMs: 1900, timestampMs: 1750, confidence: 1 },
  { text: " vídeo", startMs: 1900, endMs: 2500, timestampMs: 2200, confidence: 1 },
  { text: " 3D", startMs: 2500, endMs: 3200, timestampMs: 2800, confidence: 1 },
  { text: " feito", startMs: 3400, endMs: 3900, timestampMs: 3600, confidence: 1 },
  { text: " com", startMs: 3900, endMs: 4300, timestampMs: 4100, confidence: 1 },
  { text: " Remotion!", startMs: 4300, endMs: 6000, timestampMs: 5000, confidence: 1 },
];

const { pages } = createTikTokStyleCaptions({
  captions: legendas,
  combineTokensWithinMilliseconds: 1200,
});

const Pagina: React.FC<{ tokens: (typeof pages)[number]["tokens"]; inicioMs: number }> = ({ tokens, inicioMs }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const agoraMs = inicioMs + (frame / fps) * 1000;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 120 }}>
      <div style={{ fontFamily: "sans-serif", fontSize: 72, fontWeight: 800, color: "white", textShadow: "0 4px 12px #000", whiteSpace: "pre" }}>
        {tokens.map((t) => (
          <span key={t.fromMs} style={{ color: agoraMs >= t.fromMs && agoraMs < t.toMs ? "#ffd84f" : "white" }}>
            {t.text}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const Legendas: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <>
      {pages.map((p, i) => {
        const fim = pages[i + 1]?.startMs ?? p.startMs + p.durationMs;
        const de = Math.round((p.startMs / 1000) * fps);
        const dur = Math.max(1, Math.round(((fim - p.startMs) / 1000) * fps));
        return (
          <Sequence key={i} from={de} durationInFrames={dur}>
            <Pagina tokens={p.tokens} inicioMs={p.startMs} />
          </Sequence>
        );
      })}
    </>
  );
};
