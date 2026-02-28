// app/api/video/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function VideoExtract(req: Request) {
  const { videoUrl, prompt } = await req.json();

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // ejemplo

  const result = await model.generateContent([
    { text: prompt ?? "Describe el vídeo y resume los eventos con timestamps." },
    // En la doc: pasar vídeo por URL como "part" de tipo fileData / uri, etc.
    { fileData: { mimeType: "video/mp4", fileUri: videoUrl } },
  ]);

  return Response.json({ text: result.response.text() });
}