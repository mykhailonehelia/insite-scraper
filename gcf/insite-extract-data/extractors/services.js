/*
  const enrichedServicePromises = companyInfo.services.map((service) =>
    enrichService(gemini, cache, service)
  );
  const enrichedServices = await Promise.all(enrichedServicePromises);
  return {
    Services: {
      __type: "T",
      data: enrichedServices,
    },
    Other: {
      socialMediaLinks: companyInfo.socialMedia,
      mapsLink: companyInfo.mapsLink,
    },
  };
  */

/*
/**
 * @param {GenerativeModel} gemini
 * @param {GcsCache} cache
 * @param {string} service
async function enrichService(gemini, cache, service) {
  const normalizedService = service.trim().toLowerCase();
  console.log(`enrichService: ${service}`);
  const enrichedService = await useCache(
    cache,
    ["service", normalizedService],
    async () => {
      const p = `
    My company does "${normalizedService}". Please write a concise (< 7 words) description and choose the most relevant free font awesome icon.
    
    Please output in the following format in a code block:
    {
      "description": "some description",
      "icon": "fa-icon"
    }
    `;
      const resp = await prompt(gemini, p);
      const parsed = extractJson(resp);
      if (
        typeof parsed.description !== "string" ||
        typeof parsed.icon !== "string"
      ) {
        throw new Error(`Invalid service enrichment: ${resp}`);
      }
      return {
        Name: normalizedService,
        Description: parsed.description,
        "Font Awesome Icon": parsed.icon,
      };
    }
  );
  return enrichedService;
}
*/
