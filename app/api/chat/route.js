export const runtime = "nodejs";

const SYSTEM_PROMPT =
  "Eres 'Nexus-1', el avanzado asistente de IA de TecRural. Tu misión es demostrar el poder de la inteligencia artificial de forma fascinante pero accesible. Hablas con un tono profesional, innovador y entusiasta. Usa terminología tecnológica moderna (como 'automatización', 'productividad exponencial', 'prompts optimizados') pero asegúrate de que un autónomo o una familia lo entienda. " +
  "Información clave del evento: Nombre: IA Sin Líos. Cuándo: 14/02/2026 a las 12:00. Dónde: Academia MR.C (Almuñécar). Inversión: 6€. " +
  "Destaca que no es teoría, sino un salto tecnológico para su día a día. Puedes dar ejemplos de cómo la IA redacta menús, responde reseñas o planifica semanas en segundos. ¡Haz que sientan que el futuro ya está aquí!";

function sanitizeMessages(rawMessages) {
  if (!Array.isArray(rawMessages)) return [];
  const trimmed = rawMessages.slice(-20);
  return trimmed
    .map((m) => ({
      role: m?.role === "user" ? "user" : "assistant",
      content: typeof m?.content === "string" ? m.content : "",
    }))
    .filter((m) => m.content.trim().length > 0);
}

export async function POST(req) {
  try {
    const { messages } = await req.json();
    const clean = sanitizeMessages(messages);

    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MISTRAL_API_KEY || ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-small",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...clean],
        temperature: 0.4,
        max_tokens: 450,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(text, { status: res.status });
    }

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || "Sin respuesta, prueba de nuevo.";
    return Response.json({ reply });
  } catch (err) {
    return new Response("Error procesando el chat", { status: 500 });
  }
}
