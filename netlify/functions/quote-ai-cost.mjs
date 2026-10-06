import { calculateOcrCost, calculateSummaryCost } from "../../src/lib/economyCatalog.js";
import { handleError, json, parseBody } from "./_shared/http.mjs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const body = parseBody(event);
    const cost = body.task === "ocr"
      ? calculateOcrCost(body.pageCount)
      : body.task === "quiz"
        ? Math.max(1, Math.ceil((Number(body.questionCount) || 10) / 5))
        : calculateSummaryCost(body.charCount);
    return json(200, { task: body.task || "summary", cost });
  } catch (error) {
    return handleError(error);
  }
};
