export const config = { runtime: 'edge' }

const API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const body = await req.json()

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({
      model: body.model,
      messages: body.messages,
      max_tokens: body.max_tokens ?? 1024,
      temperature: body.temperature ?? 0.6,
      top_p: body.top_p ?? 0.95,
      stream: true,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return new Response(err, { status: response.status })
  }

  // Stream the SSE response straight through to the client
  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  })
}
