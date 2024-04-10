function testGeminiEval() {
  populateGeminiEvaluationColumns(SpreadsheetApp.getActiveSheet())
}

function templateWebsiteScoringPrompt(text, businessArea) {
  return `
  text:
  \`\`\`
  ${text.slice(0, 100 * 1000)}
  \`\`\`

  - Does the example include a clear call-to-action (CTA)?
  - Is the CTA relevant to the business's services?
  - Does the copy provide detailed information about the business's services?
  - Is the copy persuasive and engaging?
  - Does the copy focus on the benefits of using the business's services?
  - Does the copy use keywords that potential customers might search for?
  - Does the copy evoke emotions and establish an emotional connection with the reader, making them more inclined to use the business's services?
  - Does the copy build trust and credibility by showcasing testimonials, positive reviews, or industry certifications?
  - Is the copy written in a professional and refined manner, free of grammatical errors and typos?
  - Does the example stand out from competitors by highlighting unique or differentiating aspects of the business's services?
  - Does the copy avoid using generic or vague language and instead provide specific details about the business's offerings?


  This website is for a business that does "${businessArea}".
  please evaluate the text above using this list of questions.

  return one of the following results:

  - "good": return "good" if the website is functional, has appropriate CTAs, relevant copy, and is free of typos.
  - "average": return "average" if the website has some problems (typos, missing CTAs, generic or bland copy)
  - "bad": return "bad" if the website has major issues, or many minor ones (or is unrelated to the business)

  If the website isn't related to "${businessArea}", mark it as "bad".

  Don't include the quotes in your response.

  Include a short explanation after the result.

  example: good, had only minor issues with CTA quality
  example: bad, had severe issues, was very generic, etc

  Rating:
`.trim();
}

function populateGeminiEvaluationColumns(sheet) {
  const lastRow = getLastDataRowInColumn(sheet, "A");
  const businessAreaColumnIndex = columnLetterToIndex("H");
  const websiteItems = sheet
    .getRange(2, businessAreaColumnIndex, lastRow - 1, 25)
    .getValues()
    .map((row) => {
      const item = {
        businessArea: row[0],
        url: row[24],
      };
      if (item.url !== "") {
        item.website = new Website(row[24]);
      }
      return item;
    });

  /*
    const genWebsiteRequest = (rawWebsiteItem) => {
      if (rawWebsiteItem.url === "") return null;
      return {
        url: rawWebsiteItem.url,
      };
    };
    batchRequests(websiteItems, genWebsiteRequest);
    websiteItems.forEach((item) => {
      if (item.response !== undefined) {
        item.html = precleanHtml(item.response.getContentText());
        delete item.response;
      }
    });  
    */
  const websiteItemToPrompt = (item) => {
    if (item.website === undefined) return null;
    return templateWebsiteScoringPrompt(item.website.text, item.businessArea);
  }
  batchPromptGemini(websiteItems, websiteItemToPrompt);
  //websiteItems.forEach((item) => { delete item.html });

  const geminiResultsColumnIndex = columnLetterToIndex("AL");

  const geminiEvaluationResults = websiteItems.map((item) => item.response !== undefined ? [item.response.trim()] : [""]);
  sheet.getRange(2, geminiResultsColumnIndex, lastRow - 1).setValues(geminiEvaluationResults);
}