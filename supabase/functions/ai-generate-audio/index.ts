// Supabase Edge Function: ai-generate-audio
// Handles text-to-speech via Silero TTS

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    const { text, voice = 'female', speed = 1.0 } = await req.json()

    if (!text) {
      return new Response(JSON.stringify({ error: 'Text is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // Silero TTS API
    const speakerId = voice === 'male' ? 'aidar' : 'baya'
    const response = await fetch('https://router.w偬ы.silero.ai/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        speaker: speakerId,
        sample_rate: 48000,
      }),
    }).catch(() => null)

    if (response && response.ok) {
      const audioBuffer = await response.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))
      return new Response(JSON.stringify({ audioUrl: `data:audio/wav;base64,${base64}` }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // Fallback: return empty (frontend will handle gracefully)
    return new Response(JSON.stringify({ audioUrl: '', note: 'Silero TTS not available. Configure Silero API access.' }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ audioUrl: '', error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})