import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Audio } from "@remotion/media";
import { staticFile } from "remotion";
import "./fonts";
import { Background } from "./components/Background";
import { OVERLAP, scenes, TOTAL } from "./timing";
import { SceneDias, SceneHook, SceneLogin } from "./scenes1";
import { ScenePesos, SceneTimer, SceneNota } from "./scenes2";
import { SceneCierre, SceneYohi } from "./scenes3";

const list: { key: keyof typeof scenes; C: React.FC<{ duration: number }> }[] = [
  { key: "hook", C: SceneHook },
  { key: "login", C: SceneLogin },
  { key: "dias", C: SceneDias },
  { key: "pesos", C: ScenePesos },
  { key: "timer", C: SceneTimer },
  { key: "nota", C: SceneNota },
  { key: "yohi", C: SceneYohi },
  { key: "cierre", C: SceneCierre },
];

export const Main: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#111111" }}>
    <Background />
    {list.map(({ key, C }, i) => {
      const { from, to } = scenes[key];
      const dur = to - from + (i === list.length - 1 ? 0 : OVERLAP);
      return (
        <Sequence key={key} from={from} durationInFrames={dur} name={key}>
          <C duration={dur} />
        </Sequence>
      );
    })}
    {/* Pista de audio lista y silenciosa (reemplazable por audio con licencia verificable) */}
    <Audio src={staticFile("audio/pista-silenciosa.wav")} volume={1} />
  </AbsoluteFill>
);

export const DURATION = TOTAL;
