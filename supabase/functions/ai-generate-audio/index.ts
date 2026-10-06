// Supabase Edge Function: ai-generate-audio
// Silero TTS (server-side; keys/URL stay in Edge secrets).
// Env: SILERO_TTS_URL (optional custom endpoint), SILERO_API_KEY

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function env(name: string): string {
  return Deno.env.get(name) || '';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { text, voice = 'female', speed = 1.0 } = await req.json();
    if (!text || !String(text).trim()) {
      return new Response(JSON.stringify({ error: 'text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const speaker = voice === 'male' ? 'aidar' : 'baya';
    const sampleRate = Math.round(48000 * (Number(speed) || 1));

    // 1) Custom Silero endpoint (self-hosted / cloud proxy) when configured
    const customUrl = env('SILERO_TTS_URL');
    if (customUrl) {
      const res = await fetch(customUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(env('SILERO_API_KEY') ? { Authorization: `Bearer ${env('SILERO_API_KEY')}` } : {}),
        },
        body: JSON.stringify({ text: String(text).slice(0, 2000), speaker, sample_rate: sampleRate }),
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('json')) {
          const data = await res.json();
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const buf = new Uint8Array(await res.arrayBuffer());
        let binary = '';
        for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
        const base64 = btoa(binary);
        return new Response(JSON.stringify({ audioUrl: `data:audio/wav;base64,${base64}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 2) Community Silero HTTP API (best-effort)
    try {
      const res = await fetch('https://cloud.silero.ai/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: String(text).slice(0, 2000),
          speaker,
          sample_rate: sampleRate,
        }),
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('json')) {
          const data = await res.json();
          if (data?.audioUrl || data?.base64) {
            return new Response(JSON.stringify(data), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } else {
          const buf = new Uint8Array(await res.arrayBuffer());
          if (buf.length > 1000) {
            let binary = '';
            for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
            return new Response(
              JSON.stringify({ audioUrl: `data:audio/wav;base64,${btoa(binary)}` }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
          }
        }
      }
    } catch {
      // fall through
    }

    // 3) No TTS backend available — client should use speechSynthesis fallback
    return new Response(
      JSON.stringify({
        audioUrl: '',
        fallback: 'speech-synthesis',
        note: 'Silero TTS not configured. Set SILERO_TTS_URL or SILERO_API_KEY Edge secrets.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ audioUrl: '', error: String(error?.message || error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
