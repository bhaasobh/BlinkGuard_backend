const VISION_API_URL = "https://vision.googleapis.com/v1/images:annotate";

export const extractTextFromImage = async (imageBuffer) => {
  const apiKey = process.env.GOOGLE_VISION_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("GOOGLE_VISION_API_KEY is not configured");
  }

  const response = await fetch(`${VISION_API_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      requests: [
        {
          image: {
            content: imageBuffer.toString("base64")
          },
          features: [
            {
              type: "TEXT_DETECTION"
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Vision request failed: ${response.status} ${text}`);
  }

  const result = await response.json();
  const annotation = result.responses?.[0];

  if (annotation?.error?.message) {
    throw new Error(`Google Vision request failed: ${annotation.error.message}`);
  }

  return (
    annotation?.fullTextAnnotation?.text ||
    annotation?.textAnnotations?.[0]?.description ||
    ""
  ).trim();
};
