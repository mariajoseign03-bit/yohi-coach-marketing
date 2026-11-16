import { Config } from "@remotion/cli/config";
Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// En este entorno se usa el Chromium local; en tu computador puedes quitar esta línea.
if (process.env.REMOTION_CHROME) Config.setBrowserExecutable(process.env.REMOTION_CHROME);
