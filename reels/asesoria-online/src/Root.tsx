import React from "react";
import { Composition } from "remotion";
import { video } from "./theme";
import { totalFrames } from "./timing";
import { YohiAsesoria } from "./YohiAsesoria";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="YohiAsesoriaOnline"
        component={YohiAsesoria}
        durationInFrames={totalFrames}
        fps={video.fps}
        width={video.width}
        height={video.height}
      />
    </>
  );
};
