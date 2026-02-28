import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

type GeminiStoredResponse = {
  name: string;
  score: number;
  descriptionIA: string;
  tags: string[];
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
    "score": numero entero entre 0 y 100 calculado con el modelo indicado,
    "descriptionIA": "texto plano maximo 150 caracteres, sin saltos de linea",
    "tags": ["tag1", "tag2"]
  }

  Modelo complejo de score:
  - Subpuntuaciones 0-100: relevanciaPreferencias(30), accionabilidad(25), claridad(15), impacto(10), esfuerzo(10 inverso), urgencia(10).
  - Penaliza: -20 faltan datos para actuar, -15 vago, -10 dependencias inciertas, -10 contradice preferencias.
  - Redondea entero y limita a 0-100.

  Reglas estrictas:
  - descriptionIA Descripción del elemento en máximo 150 caracteres, centrada exclusivamente en el elemento concreto, sin listas, markdown ni saltos de línea.
  - tags: array de 1-3 etiquetas conceptuales en minusculas (ej: finanzas, salud, trabajo, ocio, educacion, hogar, tecnologia, mascotas). Usa categorias amplias y genericas.
  - JSON parseable.
  `;

  const result = await model.generateContent(prompt);

  const text = result.response.text();

  // Limpieza defensiva por si Gemini mete markdown
  const cleaned = text.replace(/```json|```/g, "").trim();

  const parsed = JSON.parse(cleaned) as GeminiStoredResponse;
  
  // Validar y normalizar tags
  if (!parsed.tags || !Array.isArray(parsed.tags)) {
    parsed.tags = [];
  } else {
    parsed.tags = parsed.tags
      .map((tag) => (typeof tag === "string" ? tag.toLowerCase().trim() : ""))
      .filter((tag) => tag.length > 0)
      .slice(0, 3);
  }
  
  return parsed;
}