import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Legendas } from "./Legendas";

// Para adicionar áudio: coloque um arquivo em public/ e descomente:
// import { Audio } from "@remotion/media";
// import { staticFile } from "remotion";
// <Audio src={staticFile("musica.mp3")} />

const Cubo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const escala = spring({ frame, fps, config: { damping: 12 } });
  const rot = interpolate(frame, [0, 180], [0, Math.PI * 2]);

  return (
    <mesh rotation={[rot * 0.6, rot, 0]} scale={escala}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="#4f8cff" metalness={0.3} roughness={0.35} />
    </mesh>
  );
};

export const Cena3D: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#0b1020, #1b2440)" }}>
      <ThreeCanvas width={width} height={height} camera={{ position: [0, 0, 6], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 5, 5]} intensity={2} />
        <Cubo />
      </ThreeCanvas>
      <Legendas />
    </AbsoluteFill>
  );
};
