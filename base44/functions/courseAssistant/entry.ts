import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { prompt } = await req.json().catch(() => ({}));

    if (!prompt || typeof prompt !== 'string') {
      return Response.json({ error: 'prompt مطلوب' }, { status: 400 });
    }

    const reply = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });

    return Response.json({ reply: typeof reply === 'string' ? reply : JSON.stringify(reply) });
  } catch (error) {
    return Response.json({ error: error.message || 'حصل خطأ' }, { status: 500 });
  }
});