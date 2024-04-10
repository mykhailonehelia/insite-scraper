function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("Project Insite")
    .addItem("Score Websites", "scoreWebsites")
    .addToUi();
}

function scoreWebsites() {
  const sheet = SpreadsheetApp.getActiveSheet();

  //populateLighthouseColumns(sheet);
  populateGeminiEvaluationColumns(sheet);
}