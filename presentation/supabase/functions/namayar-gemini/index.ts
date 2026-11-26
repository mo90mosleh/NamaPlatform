const demoOrigin = 'https://mo90mosleh.github.io';
const model = Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash';
const headers = {
  'Access-Control-Allow-Origin': demoOrigin,
  'Access-Control-Allow-Headers': 'apikey, authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

async function remaining(consume: boolean): Promise<number> {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(Deno.env.get('SUPABASE_URL') + '/rest/v1/rpc/namayar_demo_remaining', {
    method: 'POST',
    headers: { apikey: serviceKey!, Authorization: 'Bearer ' + serviceKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ consume }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw Error('Demo quota unavailable');
  const value = await response.json();
  if (!Number.isInteger(value)) throw Error('Invalid demo quota');
  return value;
}

Deno.serve(async (request) => {
  if (request.headers.get('origin') !== demoOrigin) return json({ error: 'origin' }, 403);
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method !== 'GET' && request.method !== 'POST') return json({ error: 'method' }, 405);
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) return json({ error: 'configuration' }, 503);

  try {
    if (request.method === 'GET') return json({ remaining_percent: await remaining(false) });

    // Bound the actual request body, including requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return json({ error: 'body' }, 400);
    const decoder = new TextDecoder();
    let source = '';
    let bytes = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 16000) {
        await reader.cancel();
        return json({ error: 'body_size' }, 413);
      }
      source += decoder.decode(value, { stream: true });
    }
    const body = JSON.parse(source + decoder.decode());
    const question = typeof body?.question === 'string' ? body.question.trim() : '';
    if (!question || question.length > 1200) return json({ error: 'question' }, 400);
    const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
    const contents = history.flatMap((message) =>
      (message?.role === 'user' || message?.role === 'assistant') && typeof message.content === 'string'
        ? [{ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content.slice(0, 600) }] }]
        : [],
    );
    contents.push({ role: 'user', parts: [{ text: question }] });

    if (await remaining(true) < 0) return json({ error: 'daily_limit' }, 429);
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent',
      {
        method: 'POST',
        headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: 'شما نمایار، دستیار نسخهٔ دموی نما هستید. به فارسی و مختصر پاسخ دهید. اطلاعات سازمانی یا مسیرهای داخلی را حدس نزنید.' }] },
          contents,
          generationConfig: { maxOutputTokens: 1024 },
        }),
        signal: AbortSignal.timeout(25000),
      },
    );
    if (!response.ok) {
      console.error('Gemini request failed', response.status);
      return json({ error: 'provider' }, response.status === 429 ? 429 : 502);
    }
    const result = await response.json();
    const parts: { text?: string; thought?: boolean }[] = result.candidates?.[0]?.content?.parts ?? [];
    const answer = parts.filter(part => !part.thought).map(part => part.text ?? '').join('').trim();
    if (!answer) return json({ error: 'empty_response' }, 502);
    return json({ paragraphs: [answer.slice(0, 4000)], links: [] });
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: 'json' }, 400);
    return json({ error: 'unavailable' }, 503);
  }
});
