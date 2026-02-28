// app/api/pdf/ocr/route.ts
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function PDFExtract(req: Request) {
  const { pageImageUrls } = await req.json(); // array de URLs (PNG/JPG)

  const results: string[] = [];

  for (const url of pageImageUrls) {
    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Extrae TODO el texto visible (OCR). Respeta saltos de línea." },
            { type: "image_url", image_url: { url } },
          ],
        },
      ],
    });

    results.push(completion.choices?.[0]?.message?.content ?? "");
  }

  return Response.json({ text: results.join("\n\n---\n\n") });
}