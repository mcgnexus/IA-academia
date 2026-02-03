export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { to, body } = await req.json();
    if (!to || !body) {
      return new Response("Faltan campos", { status: 400 });
    }

    const res = await fetch("https://gate.whapi.cloud/messages/text", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHAPI_TOKEN || ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, body }),
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(text, { status: res.status });
    }

    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    return new Response("Error enviando WhatsApp", { status: 500 });
  }
}
