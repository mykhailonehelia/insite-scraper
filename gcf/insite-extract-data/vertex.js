import functions from "@google-cloud/functions-framework";
import {
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

functions.http("vertex", async (req, res) => {
  const project = "default-gas-project";
  const location = "us-central1";
  const model = "gemini-1.0-pro";
  const vertex = new VertexAI({ project, location });

  const gemini = vertex.getGenerativeModel({ model, safetySettings });

  const query = req.query.q;
  if (typeof query !== "string") {
    throw new Error("please specify a query");
  }
  const result = await gemini.generateContent(query);
  res.status(200).send(result.response);
});
