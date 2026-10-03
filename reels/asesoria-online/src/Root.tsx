import React from "react";
import { Composition } from "remotion";
import { video } from "./theme";
import { YohiAsesoria } from "./YohiAsesoria";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="YohiAsesoriaOnline"
        component={YohiAsesoria}
        durationInFrames={video.durationInFrames}
        fps={video.fps}
        width={video.width}
        height={video.height}
      />
    </>
  );
};
