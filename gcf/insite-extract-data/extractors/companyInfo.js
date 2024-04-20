import { getCompanyInfo } from "../helpers/companyInfo.js";

/**
 * @param {import("../types.js").ExtractorParameters} params
 * @returns {Promise<import("../types.js").Table>}
 */
export async function extractCompanyInfo(params) {
  const companyInfoJson = await getCompanyInfo(params);
  return {
    __type: "K",
    name: "Company Info",
    data: {
      Name: companyInfoJson.businessName,
      Phone: companyInfoJson.phoneNumber,
      Email: companyInfoJson.emailAddress,
      "Street Address": companyInfoJson.address.street,
      City: companyInfoJson.address.city,
      State: companyInfoJson.address.state,
      Zip: companyInfoJson.address.zip,
    },
  };
}
