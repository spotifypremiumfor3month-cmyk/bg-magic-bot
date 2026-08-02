const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const CUTOUT_PROMPT = [
  "Remove the background of this image with professional, studio-quality precision.",
  "Keep the main subject perfectly intact with clean, sharp, anti-aliased edges,",
  "preserving fine details such as hair strands, fur, transparency and soft shadows on the subject itself.",
  "Output the subject isolated on a fully transparent background (alpha channel), as a PNG.",
  "Do not add any new background, color fill, watermark, text, border or shadow.",
  "Do not crop, resize, restyle or alter the subject in any way.",
].join(" ");

const BLACK_PROMPT = [
  "Remove the background of this image with professional, studio-quality precision.",
  "Keep the main subject perfectly intact with clean, sharp, anti-aliased edges,",
  "preserving fine details such as hair strands and fur.",
  "Place the isolated subject on a completely solid pure black background (#000000),",
  "edge to edge, with absolutely no white, grey, checkerboard, gradient or vignette anywhere.",
  "Do not add any watermark, text, border, shadow or reflection, and do not crop, resize or restyle the subject.",
].join(" ");

async function generate(
  prompt: string,
  imageBytes: ArrayBuffer,
  mimeType: string,
): Promise<Uint8Array> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const base64 = bytesToBase64(new Uint8Array(imageBytes));

  const response = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image",
      modalities: ["image", "text"],
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 429) throw new Error("RATE_LIMIT");
    if (response.status === 402) throw new Error("NO_CREDITS");
    throw new Error(`AI gateway failed [${response.status}]: ${body}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{
      message?: { images?: Array<{ image_url?: { url?: string } }> };
    }>;
  };

  const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url || !url.startsWith("data:")) {
    throw new Error("AI gateway returned no image");
  }

  return base64ToBytes(url.slice(url.indexOf(",") + 1));
}

/** Returns a PNG buffer of the subject cut out on a transparent background. */
export function removeBackground(imageBytes: ArrayBuffer, mimeType: string) {
  return generate(CUTOUT_PROMPT, imageBytes, mimeType);
}

/** Returns a PNG buffer of the subject on a solid pure-black background. */
export function blackBackground(imageBytes: ArrayBuffer, mimeType: string) {
  return generate(BLACK_PROMPT, imageBytes, mimeType);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}