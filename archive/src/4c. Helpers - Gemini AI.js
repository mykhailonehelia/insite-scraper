function generateGeminiRequest(prompt) {
  const geminiBaseUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
  const payload = {
    contents: [
      { role: "user", parts: [{ text: prompt }] }
    ],
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_ONLY_HIGH"
      }
    ]
  };

  return {
    url: geminiBaseUrl,
    method: "post",
    headers: {
      Authorization: "Bearer " + ScriptApp.getOAuthToken(),
      "Content-Type": "application/json",
    },
    payload: JSON.stringify(payload),
  };
}

function parseGeminiResponse(response) {
  let txt = "";
    try {
      const rawResponseText = response.getContentText();
      const responseData = JSON.parse(rawResponseText);
      //Logger.log(rawResponseText)
      if (responseData.candidates) {
        responseData.candidates.forEach((candidate) => {
          candidate.content.parts.forEach((part) => {
            txt += `${part.text}\n`;
          });
        });
      } else {
        throw new Error(`Did not get expected response ${rawResponseText}`);
      }
    } catch (err) {
      throw new Error(`got error while parsing Gemini response: ${err}`)
    }
  return txt;
}

function batchPromptGemini(items, itemToPromptFn) {
  const itemToReq = (item) => {
    const prompt = itemToPromptFn(item);
    if (prompt === null) return null;
    return generateGeminiRequest(prompt);
  };
  batchRequests(items, itemToReq);
  items.forEach((item) => {
    if (item.response !== undefined) {
      item.response = parseGeminiResponse(item.response);
    }
  });
}

function testBatchGemini() {
  const items = [
    { prompt: "this is a test", meta: 1},
    { prompt: "what is 1 + 2?", meta: 2 },
  ];

  const itemToPrompt = (item) => item.prompt;
  
  batchPromptGemini(items, itemToPrompt);

  Logger.log(JSON.stringify(items, null, 2));
}