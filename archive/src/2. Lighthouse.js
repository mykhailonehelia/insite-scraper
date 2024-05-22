const PS_URL_BASE =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const PS_URL_OPTIONS =
  "&strategy=mobile&category=BEST_PRACTICES&category=PERFORMANCE&category=ACCESSIBILITY&category=SEO";



function populateLighthouseColumns(sheet) {
  const lastRow = getLastDataRowInColumn(sheet, "A");
  const originalUrlColumnIndex = columnLetterToIndex("I");

  const urls = sheet
    .getRange(2, originalUrlColumnIndex, lastRow - 1)
    .getValues()
    .map((row) => (row[0] === "null" ? "" : row[0]));

  const responses = getScoresFromPageSpeedAPI(urls);

  const values = responses.map((resp) => {
    return [
      resp.ok,
      resp.url,
      resp.performance,
      resp.accessibility,
      resp.best_practices,
      resp.seo,
    ];
  });

  const lhOkColumnIndex = columnLetterToIndex("AE");
  const lhRange = sheet.getRange(2, lhOkColumnIndex, lastRow - 1, values[0].length)
  lhRange.setValues(values);
}

function getScoresFromPageSpeedAPI(urls) {
  const urlObjs = urls.map((url) => ({ url, response: null }));

  const genRequest = (item) => {
    if(item.url === "") return null;
    return {
      url: PS_URL_BASE + "?url=" + formatUrl(item.url) + PS_URL_OPTIONS,
      headers: {
        Authorization: "Bearer " + ScriptApp.getOAuthToken(),
      },
    }
  };

  Logger.log(`making ${urlObjs.length} requests to PageSpeed Insights`);
  batchRequests(
    urlObjs,
    genRequest,
  );
  Logger.log(`received ${urlObjs.length} responses from PageSpeed Insights`);

  const responseItems = urlObjs.map((urlObj) => {
    const emptyResponse = {
      ok: false,
      url: "",
      performance: "",
      accessibility: "",
      best_practices: "",
      seo: "",
    };

    if (urlObj.response === null) {
      return emptyResponse;
    }

    const curJsonResponse = JSON.parse(urlObj.response.getContentText());
    if (curJsonResponse.error !== undefined) {
      return emptyResponse;
    } else {
      const categoriesBase = curJsonResponse.lighthouseResult.categories;
      return {
        ok: true,
        url: curJsonResponse.lighthouseResult.finalUrl,
        performance: categoriesBase.performance.score,
        accessibility: categoriesBase.accessibility.score,
        best_practices: categoriesBase["best-practices"].score,
        seo: categoriesBase.seo.score,
      };
    }
  });

  return responseItems;
}
