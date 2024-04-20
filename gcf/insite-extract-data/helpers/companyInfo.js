import { useCache } from "./cache.js";
import { promptGemini, extractJson } from "./gemini.js";
import { html2md } from "./html2md.js";
import { getHtml } from "./scrapingbee.js";

/**
 *
 * @param {import("../types").ExtractorParameters} params
 * @returns {Promise<object>}
 */
async function getCompanyInfo(params) {
  const cacheKey = [params.url, "company-info-json"];
  const companyInfoJson = await useCache(params.cache, cacheKey, async () => {
    const html = await getHtml(params);
    const md = html2md(html);
    const p = `
  The following is markdown from a webpage:
  
  """
  ${md}
  """

  Please extract the following details as a JSON object.
  If any fields aren't included, they should be null. If all fields within an object are null, mark each individual property as null, rather than the object.
  Do not include any extra fields in the JSON response.

  Example:
  {
    "businessName": "",
    "phoneNumber": "",
    "emailAddress": "",
    "address": {
      "street": "",
      "city": "",
      "state": "",
      "zip": ""
    },
    "services": ["service1", "service2"],
    "socialMedia": ["link1", "link2"],
    "mapsLink": "",
  }
  `;

    const resp = await promptGemini(params.gemini, p);
    return extractJson(resp);
  });
  return companyInfoJson;
}

export { getCompanyInfo };
