export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") || 1;
    const response = await fetch(`RAG_API_URL?page=${page}`);
    const data = await response.json();
    return new Response(JSON.stringify({ results: data.results, totalPages: data.totalPages }), { status: 200 });
}