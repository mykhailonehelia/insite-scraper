import { useCache } from "./cache.js";
import { promptGemini, extractJson } from "./gemini.js";
import { html2md } from "./html2md.js";
import { getHtml } from "./scrapingbee.js";

/**
 *
 * @param {import("../types").ExtractorParameters} params
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
    "email": "",
    "streetAddress": "",
    "city": "",
    "state": "",
    "zip": "",
    "services": ["service1", "service2"],
    "socialMedia": ["link1", "link2"],
    "mapsLink": "",
  }
  `;

    const resp = await promptGemini(params.gemini, p);
    const json = extractJson(resp);
    /**
     * @param {string|null|undefined} val
     */

    const asString = (val) => val || "";
    /**
     *
     * @param {any[]} val
     */
    const asStringArray = (val) =>
      val.length > 0 ? val.map((e) => asString(e)) : [];

    const result = {
      businessName: asString(json.businessName),
      phoneNumber: asString(json.phoneNumber),
      email: asString(json.email),
      streetAddress: asString(json.streetAddress),
      city: asString(json.city),
      state: asString(json.state),
      zip: asString(json.zip),
      services: asStringArray(json.services),
      socialMedia: asStringArray(json.socialMedia),
      mapsLink: asString(json.mapsLink),
    };
    return result;
  });
  return companyInfoJson;
}

export { getCompanyInfo };
