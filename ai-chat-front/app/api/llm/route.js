export async function POST(req) {
    const { message, previousMessages } = await req.json();
    const response = await fetch("LLM_API_URL", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, previousMessages }),
    });
    const data = await response.json();
    return new Response(JSON.stringify({ response: data.answer }), { status: 200 });
}
