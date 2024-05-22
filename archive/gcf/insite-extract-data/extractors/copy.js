import { promptGemini } from "../helpers/gemini.js";
import { html2md } from "../helpers/html2md.js";
import { getHtml } from "../helpers/scrapingbee.js";

/**
 * @param {import("../types.js").ExtractorParameters} params
 * @returns {Promise<import("../types.js").Table>}
 */
async function getCopy(params) {
  const html = await getHtml(params);
  const md = html2md(html);

  const p = `
  website text:
  """
  ${md}
  """
  
  please extract or create a tagline for this business.
  `;

  const tagline = await promptGemini(params.gemini, p);
  /** @type {import("../types.js").Table} */
  const table = {
    __type: "K",
    name: "Copy",
    data: {
      something: tagline,
    },
  };
  return table;
}

export { getCopy };
