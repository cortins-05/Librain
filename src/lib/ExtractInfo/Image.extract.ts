import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function ImageExtract(req: Request) {
  const { imageUrl, task } = await req.json();

  // task examples: "ocr", "describe", "qa"
  const prompt =
    task === "ocr"
      ? "Extrae TODO el texto visible (OCR). Devuélvelo limpio, respetando saltos de línea."
      : task === "describe"
      ? "Describe la imagen con detalle y enumera elementos relevantes."
      : "Responde a mi pregunta basándote SOLO en lo que se ve en la imagen.";

  const completion = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    temperature: 0,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
  });

  return Response.json({
    text: completion.choices?.[0]?.message?.content ?? "",
  });
}