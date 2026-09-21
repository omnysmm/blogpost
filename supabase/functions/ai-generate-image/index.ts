// Supabase Edge Function: ai-generate-image
// Handles image generation via FusionBrain (Kandinsky)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const FUSIONBRAIN_API_KEY = Deno.env.get('FUSIONBRAIN_API_KEY') || ''
const FUSIONBRAIN_API_SECRET = Deno.env.get('FUSIONBRAIN_API_SECRET') || ''

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
    const { prompt, width = 1024, height = 1024 } = await req.json()

    if (!FUSIONBRAIN_API_KEY || !FUSIONBRAIN_API_SECRET) {
      return new Response(JSON.stringify({ imageUrl: '', error: 'FusionBrain API not configured' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // Step 1: Get pipeline
    const pipelineResponse = await fetch('https://api-key.fusionbrain.ai/key/api/v1/pipelines', {
      headers: {
        'X-Key': `Key ${FUSIONBRAIN_API_KEY}`,
        'X-Secret': `Secret ${FUSIONBRAIN_API_SECRET}`,
      },
    })
    const pipelines = await pipelineResponse.json()
    const pipelineId = pipelines[0]?.id

    if (!pipelineId) {
      throw new Error('No FusionBrain pipeline available')
    }

    // Step 2: Submit generation
    const generateResponse = await fetch(`https://api-key.fusionbrain.ai/key/api/v1/pipeline/run`, {
      method: 'POST',
      headers: {
        'X-Key': `Key ${FUSIONBRAIN_API_KEY}`,
        'X-Secret': `Secret ${FUSIONBRAIN_API_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pipeline_id: pipelineId,
        params: {
          query: prompt,
          width,
          height,
          num_images: 1,
        },
      }),
    })
    const generateData = await generateResponse.json()
    const requestId = generateData.uuid

    if (!requestId) {
      throw new Error('Failed to submit image generation')
    }

    // Step 3: Poll for result
    let imageUrl = ''
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const statusResponse = await fetch(`https://api-key.fusionbrain.ai/key/api/v1/pipeline/status/${requestId}`, {
        headers: {
          'X-Key': `Key ${FUSIONBRAIN_API_KEY}`,
          'X-Secret': `Secret ${FUSIONBRAIN_API_SECRET}`,
        },
      })
      const statusData = await statusResponse.json()

      if (statusData.status === 'DONE' && statusData.result?.files?.length > 0) {
        imageUrl = `data:image/png;base64,${statusData.result.files[0]}`
        break
      } else if (statusData.status === 'FAIL') {
        throw new Error('FusionBrain generation failed')
      }
    }

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ imageUrl: '', error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})