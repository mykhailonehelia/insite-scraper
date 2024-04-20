import { html2md } from "../helpers/html2md.js";
import { extractJson, promptGemini } from "../helpers/gemini.js";
import { getHtml } from "../helpers/scrapingbee.js";

/**
 * @param {import("../types.js").ExtractorParameters} params
 * @returns {Promise<import("../types.js").Table>}
 */
export async function extractCompanyInfo(params) {
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
  const respJson = extractJson(resp);

  return {
    __type: "K",
    name: "Company Info",
    data: {
      Name: respJson.businessName,
      Phone: respJson.phoneNumber,
      Email: respJson.emailAddress,
      "Street Address": respJson.address.street,
      City: respJson.address.city,
      State: respJson.address.state,
      Zip: respJson.address.zip,
    },
  };
}
