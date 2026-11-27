import { Composition } from "remotion";
import { Cena3D } from "./Cena3D";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Cena3D"
    component={Cena3D}
    durationInFrames={180}
    fps={30}
    width={1920}
    height={1080}
  />
);
