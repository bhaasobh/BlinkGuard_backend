const GOOGLE_TRANSLATE_BASE_URL =
  "https://translation.googleapis.com/language/translate/v2";
const DEFAULT_TIMEOUT_MS = 5000;

const getTimeoutMs = () => {
  const configuredTimeout = Number(process.env.GOOGLE_TRANSLATE_TIMEOUT_MS);
  return Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : DEFAULT_TIMEOUT_MS;
};

const callGoogleTranslate = async (path, body) => {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("GOOGLE_TRANSLATE_API_KEY is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());

  try {
    const response = await fetch(
      `${GOOGLE_TRANSLATE_BASE_URL}${path}?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal
      }
    );

    if (!response.ok) {
      const responseBody = await response.text();
      throw new Error(
        `Google Translate request failed: ${response.status} ${responseBody}`
      );
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
};

export const translateToEnglishForAnalysis = async (message = "") => {
  const originalText = String(message);

  if (!originalText.trim()) {
    return {
      text: originalText,
      detectedLanguage: "unknown",
      translated: false
    };
  }

  try {
    const detectionResponse = await callGoogleTranslate("/detect", {
      q: originalText
    });
    const detectedLanguage =
      detectionResponse?.data?.detections?.[0]?.[0]?.language || "unknown";

    if (detectedLanguage.toLowerCase().startsWith("en")) {
      return {
        text: originalText,
        detectedLanguage,
        translated: false
      };
    }

    const translationResponse = await callGoogleTranslate("", {
      q: originalText,
      source: detectedLanguage === "unknown" ? undefined : detectedLanguage,
      target: "en",
      format: "text"
    });
    const translatedText =
      translationResponse?.data?.translations?.[0]?.translatedText;

    if (!translatedText) {
      throw new Error("Google Translate returned no translated text");
    }

    return {
      text: translatedText,
      detectedLanguage,
      translated: true
    };
  } catch (err) {
    console.warn("Message translation failed; scanning original text:", err.message);

    return {
      text: originalText,
      detectedLanguage: "unknown",
      translated: false,
      error: err.message
    };
  }
};
