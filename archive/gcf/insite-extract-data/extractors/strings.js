/**
 * @param {import("../types.js").ExtractorParameters} params
 * @returns {Promise<import("../types.js").Table>}
 */
export async function getStrings(params) {
  return {
    __type: "K",
    name: "Strings",
    data: {
      "Hours of Operation": "INSERT_HOURS_OF_OPERATION_HERE",
      "Hero Tagline": "INSERT_HERO_TAGLINE_HERE",
      "List of Services Header Section - Font Awesome Icon":
        "INSERT_LIST_OF_SERVICES_FONT_AWESOME_ICON_HERE",
      "List of Services Header Section - Title":
        "INSERT_LIST_OF_SERVICES_TITLE_HERE",
      "List of Services Header Section - Description":
        "INSERT_LIST_OF_SERVICES_DESCRIPTION_HERE",
    },
  };
}
