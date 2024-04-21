import { useCache } from "./cache.js";
import { promptGemini, extractJson, promptGeminiStrict } from "./gemini.js";
import { html2md } from "./html2md.js";
import { getHtml } from "./scrapingbee.js";

/**
 *
 * @param {import("../types.js").ExtractorParameters} params
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
    "preferredMethodOfContact": "phone" | "email",
    "streetAddress": "",
    "city": "",
    "state": "",
    "zip": "",
    "services": ["service1", "service2"],
    "socialMedia": ["link1", "link2"],
    "mapsLink": "",
  }
  `;

    const resp = await promptGeminiStrict(params.gemini, p, (resp) => {
      const json = extractJson(resp);
      const pmoc = json.preferredMethodOfContact;
      if (pmoc !== "email" && pmoc !== "phone")
        return "preferredMethodOfContact must be either 'email' or 'phone'";
      return null;
    });
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

    /** @param {string} val */
    const asPreferredMethodOfContact = (val) => {
      if (val === "email") {
        return "email";
      } else if (val === "phone") {
        return "phone";
      } else {
        throw new Error(`Unknown preferred method of contact: '${val}'`);
      }
    };

    const result = {
      businessName: asString(json.businessName),
      phoneNumber: asString(json.phoneNumber),
      email: asString(json.email),
      /** @type {"email"|"phone"} */
      preferredMethodOfContact: asPreferredMethodOfContact(
        json.preferredMethodOfContact
      ),
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
  console.log("companyInfoJson", companyInfoJson);
  return companyInfoJson;
}

export { getCompanyInfo };
