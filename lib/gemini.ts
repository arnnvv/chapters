import { ObjectParser } from "./parser";

const API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";
const MODEL_NAME = "models/gemini-2.5-flash-preview-04-17";

interface GeminiGenerateContentRequest {
  contents: Array<{
    parts: Array<{ text: string }>;
    role?: "user" | "model";
  }>;
}

interface GeminiErrorDetail {
  "@type": string;
  reason: string;
  message: string;
}

interface GeminiErrorResponse {
  error: {
    code: number;
    message: string;
    status: string;
    details?: GeminiErrorDetail[];
  };
}

/**
 * Calls the Google Gemini API to generate content.
 *
 * @param prompt - The text prompt to send to the model.
 * @param apiKey - The Google Generative Language API key.
 * @returns The generated text content from the model.
 * @throws Throws an error if the API call fails or returns an error.
 */
export async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_GEMINI_API_KEY environment variable is not set.");
  }

  const url = `${API_ENDPOINT}/${MODEL_NAME}:generateContent?key=${apiKey}`;

  const requestBody: GeminiGenerateContentRequest = {
    contents: [
      {
        parts: [{ text: prompt }],
        // You could add role: "user" here if building conversational context later
      },
    ],
    // TODO: Consider adding safetySettings and generationConfig for finer control
    // generationConfig: {
    //   temperature: 0.7, // Example
    //   maxOutputTokens: 1024 // Example
    // }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const responseData: unknown = await response.json(); // Read response body once

    if (!response.ok) {
      console.error("Gemini API Error Response:", responseData);
      const errorResponse = responseData as GeminiErrorResponse;
      let errorMessage = `Gemini API Error: ${response.status} ${response.statusText}`;
      if (errorResponse.error?.message) {
        errorMessage += ` - ${errorResponse.error.message}`;
      }
      throw new Error(errorMessage);
    }

    // --- Response Parsing ---
    // Use ObjectParser for safer access, though manual checks are fine too.
    const parser = new ObjectParser(responseData);

    if (!parser.has("candidates") || !parser.isArray("candidates")) {
      console.error(
        "Invalid Gemini Response: Missing 'candidates' array",
        responseData,
      );
      throw new Error(
        "Invalid response format from Gemini API: Missing candidates.",
      );
    }

    const candidates = parser.getArray("candidates");
    if (candidates.length === 0) {
      console.error(
        "Invalid Gemini Response: Empty 'candidates' array",
        responseData,
      );
      throw new Error(
        "Invalid response format from Gemini API: No candidates returned.",
      );
    }

    const firstCandidateParser = new ObjectParser(candidates[0]);

    // Check for finish reason other than STOP (e.g., MAX_TOKENS, SAFETY, RECITATION)
    if (
      firstCandidateParser.has("finishReason") &&
      firstCandidateParser.getString("finishReason") !== "STOP"
    ) {
      console.warn(
        `Gemini response finished with reason: ${firstCandidateParser.getString("finishReason")}`,
      );
      // Decide how to handle non-STOP finishes (e.g., throw error, return partial, etc.)
    }

    if (
      !firstCandidateParser.has("content", "parts") ||
      !firstCandidateParser.isArray("content", "parts")
    ) {
      console.error(
        "Invalid Gemini Response: Missing 'content.parts' array",
        candidates[0],
      );
      throw new Error(
        "Invalid response format from Gemini API: Missing content parts.",
      );
    }

    const parts = firstCandidateParser.getArray("content", "parts");
    if (
      parts.length === 0 ||
      typeof parts[0] !== "object" ||
      parts[0] === null ||
      !("text" in parts[0]) ||
      typeof parts[0].text !== "string"
    ) {
      console.error(
        "Invalid Gemini Response: Missing 'text' in first part",
        parts,
      );
      throw new Error(
        "Invalid response format from Gemini API: Missing text in response part.",
      );
    }

    // Assuming the first part contains the main text response
    return parts[0].text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    // Re-throw network errors or parsing errors
    if (error instanceof Error) {
      throw new Error(`Failed to call Gemini API: ${error.message}`);
    }
    throw new Error("An unknown error occurred while calling the Gemini API.");
  }
}

// Optional: Add a function specifically for JSON output if needed often
export async function callGeminiForJson<T>(prompt: string): Promise<T> {
  const rawResponse = await callGemini(prompt);
  try {
    // Basic cleaning: remove potential markdown code block fences
    const cleanedResponse = rawResponse.replace(/^```json\s*|```$/g, "").trim();
    return JSON.parse(cleanedResponse) as T;
  } catch (e) {
    console.error("Failed to parse Gemini response as JSON:", rawResponse, e);
    throw new Error("Gemini did not return valid JSON.");
  }
}
