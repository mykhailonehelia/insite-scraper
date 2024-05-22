import { extractJson, promptGemini } from "../helpers/gemini.js";
import { extractDataFromHTML } from "../helpers/html.js";
import { getHtml } from "../helpers/scrapingbee.js";

/**
 * @param {import("../types.js").ExtractorParameters} params
 * @returns {Promise<import("../types.js").Table>}
 */
async function getImages(params) {
  const imageUrlPromises = [getLogoImageUrl(params)];

  await Promise.all(imageUrlPromises);
  return {
    __type: "K",
    name: "Images",
    data: {
      "Logo Image URL": await imageUrlPromises[0],
      "Hero Background URL": "INSERT_HERO_BACKGROUND_URL_HERE",
    },
  };
}

/**
 * @param {import("../types.js").ExtractorParameters} params
 * @returns {Promise<string>}
 */
async function getLogoImageUrl(params) {
  const html = await getHtml(params);
  const extractedData = await extractDataFromHTML(params.url, html);
  console.log(extractedData.images.length, extractedData.images);
  const p = `
  Here are a list of images pulled from a website:
  """
  ${JSON.stringify(extractedData.images)}
  """

  Please return a single JSON object corresponding to the logo image in a code block, or null if none of them are the logo.
  `;

  const resp = await promptGemini(params.gemini, p);
  let src = "";
  try {
    src = extractJson(resp).src;
    if (src === undefined) src = "";
  } catch (err) {
    console.error(`error parsing JSON from gemini: ${err}.`);
    src = "";
  }
  return src;
}

export { getImages };
