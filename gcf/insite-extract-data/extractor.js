import { extractCompanyInfo } from "./extractors/companyInfo.js";
import { getImages } from "./extractors/images.js";
import { getColors } from "./extractors/colors.js";
import { extractServices } from "./extractors/services.js";

/**
 * @param {import("./types.js").ExtractorParameters} params
 * @returns {Promise<{[key: string]: import("./types.js").Table}>}
 */
async function extractData(params) {
  /** @type {Promise<import("./types.js").Table>[]} */
  const extractors = [
    extractCompanyInfo(params),
    getImages(params),
    getColors(params),
    extractServices(params),
  ];

  const tables = await Promise.all(extractors);

  /**
   * @type {{[key: string]: import("./types.js").Table}}
   */
  const results = {};
  for (const curTable of tables) {
    results[curTable.name] = curTable;
  }
  return results;
}

export { extractData };
