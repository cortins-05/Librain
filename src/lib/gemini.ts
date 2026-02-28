import { GoogleGenerativeAI } from "@google/generative-ai";
import { StoredState } from "@/db/Models/Task/Task.model";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

type GeminiStoredResponse = {
  name: string;
  state: StoredState;
  score: number;
  descriptionIA: string;
};

export async function generateStoredMetadata(
  extractedText: string,
  userPreferences: string[],
  userDescription?: string
): Promise<GeminiStoredResponse> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const prompt = `
  Eres un sistema que transforma contenido en conocimiento estructurado y accionable.

  Contenido extraido:
  """
  ${extractedText}
  """

  Preferencias del usuario:
  """
  ${userPreferences.join(" | ")}
  """

  Descripcion del usuario:
  """
  ${userDescription ?? ""}
  """

  Responde EXCLUSIVAMENTE con un JSON valido, sin markdown, sin bloques de codigo y sin texto fuera del JSON.

  {
    "name": "titulo claro y muy conciso (maximo 60 caracteres)",
    "state": "raw | usable | solid | actionable",
    "score": numero entero entre 0 y 100 calculado con el modelo indicado",
    "descriptionIA": "texto plano maximo 150 caracteres, sin saltos de linea"
  }

  Modelo complejo de score:
  - Subpuntuaciones 0-100: relevanciaPreferencias(30), accionabilidad(25), claridad(15), impacto(10), esfuerzo(10 inverso), urgencia(10).
  - Penaliza: -20 faltan datos para actuar, -15 vago, -10 dependencias inciertas, -10 contradice preferencias.
  - Redondea entero y limita a 0-100.
  - "state" segun grado de ejecucion real (raw/usable/solid/actionable).

  Reglas estrictas:
  - descriptionIA maximo 150 caracteres, sin listas, sin markdown, sin saltos de linea.
  - JSON parseable.
  `;

  const result = await model.generateContent(prompt);

  const text = result.response.text();

  // Limpieza defensiva por si Gemini mete markdown
  const cleaned = text.replace(/```json|```/g, "").trim();

  return JSON.parse(cleaned);
}