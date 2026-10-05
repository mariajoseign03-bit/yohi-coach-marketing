import React from "react";
import { Composition } from "remotion";
import { video } from "./theme";
import { totalFrames } from "./timing";
import { YohiAsesoria } from "./YohiAsesoria";
import { CYBER, CyberTeaser } from "./cyber/CyberTeaser";
import { CyberPrices, PRICES } from "./cyber/CyberPrices";

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
      <Composition
        id="CyberTeaser"
        component={CyberTeaser}
        durationInFrames={CYBER.total}
        fps={video.fps}
        width={video.width}
        height={video.height}
      />
      <Composition
        id="CyberPrecios"
        component={CyberPrices}
        durationInFrames={PRICES.total}
        fps={video.fps}
        width={video.width}
        height={video.height}
      />
    </>
  );
};
