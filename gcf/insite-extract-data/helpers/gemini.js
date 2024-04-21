import {
  ClientError,
  GenerativeModel,
  HarmBlockThreshold,
  HarmCategory,
  VertexAI,
} from "@google-cloud/vertexai";
import { sleep } from "./random.js";

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
async function promptGemini(gemini, prompt) {
  let result;
  try {
    const res = await gemini.generateContent(prompt);
    result = parseGeminiResponse(res.response);
  } catch (err) {
    if (err instanceof ClientError) {
      console.warn(`Got client error, retrying after 10 seconds: ${err}`);
      await sleep(10 * 1000);
      result = await promptGemini(gemini, prompt);
    }
  }
  return result || "";
}

/**
 *
 * @param {GenerativeModel} gemini
 * @param {string} prompt
 * @param {(resp: string) => string|null} validatorFn
 * @returns {Promise<string>}
 */
async function promptGeminiStrict(gemini, prompt, validatorFn) {
  let tries = 0;
  let p = prompt;
  let ok = false;

  /** @type {string} */
  let resp = "";
  while (!ok) {
    if (tries > 2) {
      throw new Error(`unable to get correct response after 3 tries: ${p}`);
    }
    resp = await promptGemini(gemini, p);
    const reasons = validatorFn(resp);
    if (reasons === null) {
      ok = true;
      break;
    } else {
      console.warn(`promptGeminiStrict: got incorrect response: ${reasons}`);
      tries++;
      p += `\n\n${reasons}`;
    }
  }

  return resp;
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

/**
 * @param {string} response
 */
function extractJson(response) {
  let obj;
  try {
    obj = JSON.parse(response);
  } catch (err) {
    const jsonLines = [];
    let inCodeBlock = false;
    const codeBlockDelimiterRegexp = /^```/;
    for (const line of response.split("\n")) {
      if (inCodeBlock && codeBlockDelimiterRegexp.test(line)) {
        break;
      }
      if (inCodeBlock) {
        jsonLines.push(line);
      }
      if (!inCodeBlock && codeBlockDelimiterRegexp.test(line)) {
        inCodeBlock = true;
      }
    }
    obj = JSON.parse(jsonLines.join("\n"));
  }
  return obj;
}

export { getGemini, promptGemini, promptGeminiStrict, extractJson };
