import { loadFont as loadBeVietnamPro } from "@remotion/google-fonts/BeVietnamPro";
import { loadFont as loadOswald } from "@remotion/google-fonts/Oswald";

const beVietnam = loadBeVietnamPro("normal", {
  weights: ["400", "600", "700", "800", "900"],
  subsets: ["vietnamese", "latin"],
});

const oswald = loadOswald("normal", {
  weights: ["700"],
  subsets: ["vietnamese", "latin"],
});

export const BeVietnamPro = beVietnam.fontFamily;
export const OswaldFont = oswald.fontFamily;

export const loadFont = () => {
  // @remotion/google-fonts handles font injection
};
