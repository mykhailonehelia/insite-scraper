import Vibrant from "node-vibrant";
import { getScreenshotData } from "../helpers/scrapingbee.js";

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
const rgbToHex = (r, g, b) =>
  "#" +
  [r, g, b]
    .map((x) => {
      const hex = x.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    })
    .join("");

/**
 * @param {import("../types.js").ExtractorParameters} params
 * @returns {Promise<import("../types.js").Table>}
 */
async function getColors(params) {
  /** @type {import("../types.js").Table} */
  const table = {
    __type: "K",
    name: "Colors",
    data: {
      "Primary Color": "",
      "Accent Color": "",
      "Dark Color": "",
    },
  };
  const screenshotBuffer = await getScreenshotData(params);
  if (screenshotBuffer === null) return table;

  const palette = await Vibrant.from(screenshotBuffer).getPalette();
  const primary = palette.Vibrant?.rgb;
  const accent = palette.Muted?.rgb;
  const dark = palette.DarkMuted?.rgb;
  table.data["Primary Color"] = primary ? rgbToHex(...primary) : "";
  table.data["Accent Color"] = accent ? rgbToHex(...accent) : "";
  table.data["Dark Color"] = dark ? rgbToHex(...dark) : "";
  return table;
}

export { getColors };
