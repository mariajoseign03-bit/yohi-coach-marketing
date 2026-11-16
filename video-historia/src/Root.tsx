import React from "react";
import { Composition } from "remotion";
import "./fonts";
import { Main } from "./Main";
import { T } from "./timing";
import { video } from "./theme";

export const RemotionRoot: React.FC = () => (
  <Composition id="YohiPortalHistoria" component={Main} durationInFrames={T.total} fps={video.fps} width={video.width} height={video.height} />
);
