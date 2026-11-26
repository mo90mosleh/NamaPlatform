const demoOrigin = 'https://mo90mosleh.github.io';
const model = Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash-lite';
const headers = {
  'Access-Control-Allow-Origin': demoOrigin,
  'Access-Control-Allow-Headers': 'apikey, authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

function answerText(result: { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] }) {
  return (result.candidates?.[0]?.content?.parts ?? [])
    .filter(part => !part.thought).map(part => part.text ?? '').join('');
}

function streamAnswer(body: ReadableStream<Uint8Array>) {
  let buffer = '';
  let hasText = false;
  const encoder = new TextEncoder();
  const stream = body.pipeThrough(new TextDecoderStream()).pipeThrough(new TransformStream<string, Uint8Array>({
    transform(chunk, controller) {
      buffer += chunk;
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() ?? '';
      for (const event of events) {
        const data = event.split(/\r?\n/).filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).trimStart()).join('\n');
        if (!data || data === '[DONE]') continue;
        const result = JSON.parse(data);
        if (result.error) throw Error('Gemini stream failed');
        const text = answerText(result);
        if (!text) continue;
        hasText ||= Boolean(text.trim());
        controller.enqueue(encoder.encode(JSON.stringify({ type: 'delta', text }) + '\n'));
      }
    },
    flush(controller) {
      const last = hasText
        ? { type: 'done', links: [] }
        : { type: 'error', message: 'پاسخی از مدل دریافت نشد. دوباره امتحان کن.' };
      controller.enqueue(encoder.encode(JSON.stringify(last) + '\n'));
    },
  }));
  return new Response(stream, { headers: { ...headers, 'Content-Type': 'application/x-ndjson; charset=utf-8' } });
}

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
  const key = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('Gemini') || Deno.env.get('GEMINI');
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
    const payload = JSON.stringify({
      systemInstruction: { parts: [{ text: 'شما نمایار، دستیار نسخهٔ دموی نما هستید. به فارسی و مختصر پاسخ دهید. اطلاعات سازمانی یا مسیرهای داخلی را حدس نزنید.' }] },
      contents,
      generationConfig: { maxOutputTokens: 1024 },
    });
    const streaming = body.stream === true;
    const method = streaming ? ':streamGenerateContent?alt=sse' : ':generateContent';
    async function generate(modelId: string) {
      const opening = new AbortController();
      const timer = setTimeout(() => opening.abort(), 6500);
      try {
        return await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(modelId) + method,
          {
            method: 'POST',
            headers: { 'x-goog-api-key': key!, 'Content-Type': 'application/json' },
            body: payload,
            signal: AbortSignal.any([request.signal, opening.signal, AbortSignal.timeout(25000)]),
          },
        );
      } catch {
        return new Response(null, { status: 503 });
      } finally {
        clearTimeout(timer);
      }
    }
    let response = await generate(model);
    if (response.status >= 500 && !request.signal.aborted) {
      await response.body?.cancel();
      response = await generate(model === 'gemini-3.5-flash-lite' ? 'gemini-3.5-flash' : 'gemini-3.5-flash-lite');
    }
    if (!response.ok) {
      console.error('Gemini request failed', response.status);
      return json({ error: 'provider' }, response.status === 429 ? 429 : 502);
    }
    if (streaming && response.body) return streamAnswer(response.body);
    const answer = answerText(await response.json()).trim();
    if (!answer) return json({ error: 'empty_response' }, 502);
    return json({ paragraphs: [answer.slice(0, 4000)], links: [] });
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: 'json' }, 400);
    return json({ error: 'unavailable' }, 503);
  }
});
