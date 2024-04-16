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

export { getGemini, prompt };
