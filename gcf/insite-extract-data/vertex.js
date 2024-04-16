import {
  GenerativeModel,
  HarmBlockThreshold,
  HarmCategory,
  VertexAI,
} from "@google-cloud/vertexai";

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

/**
 * @param {string} project
 * @param {string} location
 * @param {string} model
 */
function getGemini(project, location, model = "gemini-1.0-pro") {
  const vertex = new VertexAI({ project, location });
  const gemini = vertex.getGenerativeModel({ model, safetySettings });
  return gemini;
}

/**
 * @param {GenerativeModel} gemini
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function prompt(gemini, prompt) {
  const result = await gemini.generateContent(prompt);
  return parseGeminiResponse(result.response);
}

/**
 *
 * @param {import("@google-cloud/vertexai").GenerateContentResponse} response
 * @returns {string}
 */
function parseGeminiResponse(response) {
  if (response.candidates === undefined) {
    throw new Error(`Null response from Gemini: ${response}`);
  }
  let txt = "";
  response.candidates.forEach((candidate) => {
    candidate.content.parts.forEach((part) => {
      txt += `${part.text}\n`;
    });
  });
  return txt;
}

export { getGemini, prompt };
