import { useCache } from "../helpers/cache.js";
import { getCompanyInfo } from "../helpers/companyInfo.js";
import { extractJson, promptGeminiStrict } from "../helpers/gemini.js";
import validFaIcons from "../helpers/fa-icon-list.json" with { type: "json" };

/**
 * @param {import("../types.js").ExtractorParameters} params
 * @returns {Promise<import("../types.js").Table>}
 */
async function extractServices(params) {
  /** @type {import("../types.js").Table} */
  const table = {
    __type: "T",
    name: "Services",
    data: [],
  };

  const services = (await getCompanyInfo(params)).services;
  const enrichedServicePromises = services.map((service) =>
    enrichService(service, params)
  );
  const enrichedServices = await Promise.all(enrichedServicePromises);

  table.data = enrichedServices;
  return table;
}

/**
 * @typedef {object} EnrichedService
 * @property {string} name
 * @property {string} description
 * @property {string} icon
 */

/**
 *
 * @param {string} service
 * @param {import("../types.js").ExtractorParameters} params
 */
async function enrichService(service, params) {
  const normalizedService = service.trim().toLowerCase();
  console.log(`enrichService: ${service}`);
  const cacheKey = ["service", normalizedService];
  const enrichedService = await useCache(params.cache, cacheKey, async () => {
    const p = `
    My company does "${normalizedService}". Please write a concise (< 7 words) description and choose the most relevant font awesome icon.
    The font awesome icon must be: free, in version 5, and solid. Write only the icon name -- do not precede with "fas"
    
    Please output in the following format in a code block:
    {
      "name": "Titleized Service Name",
      "description": "Some description",
      "icon": "fa-icon"
    }
    `;

    /** @param {string} resp */
    const isValidEnrichedService = (resp) => {
      /** @type {EnrichedService} */
      let obj;
      try {
        obj = extractJson(resp);
      } catch (err) {
        return `${err}`;
      }

      ["name", "description", "icon"].forEach((prop) => {
        // @ts-ignore
        if (typeof obj[prop] !== "string") {
          return `'${prop}' property does not exist`;
        }
      });

      if (obj.icon.startsWith("fa-")) obj.icon = obj.icon.slice(3);
      if (!validFaIcons.includes(obj.icon)) {
        return `no such icon 'fa-${obj.icon}', please try a different one`;
      }

      return null;
    };

    const resp = await promptGeminiStrict(
      params.gemini,
      p,
      isValidEnrichedService
    );
    const parsed = extractJson(resp);
    if (!parsed.icon.startsWith("fa-")) parsed.icon = "fa-" + parsed.icon;
    return {
      Name: parsed.name,
      Description: parsed.description,
      "Font Awesome Icon": parsed.icon,
    };
  });
  return enrichedService;
}

export { extractServices };
