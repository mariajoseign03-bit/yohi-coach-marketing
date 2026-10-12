import React from "react";
import { Composition } from "remotion";
import { DURATION, Main } from "./Main";
import { video } from "./theme";

export const RemotionRoot: React.FC = () => (
  <Composition id="YohiPortalAlumnas" component={Main} durationInFrames={DURATION} fps={video.fps} width={video.width} height={video.height} />
);
