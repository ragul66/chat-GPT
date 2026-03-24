import { useState, useRef, useEffect } from 'react'
import './App.css'

const API_URL = "/api/chat"
const MODEL = "qwen/qwen3.5-122b-a10b"

function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // placeholder for AI response
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])
    

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          max_tokens: 1024,
          temperature: 0.6,
          top_p: 0.95,
          stream: true,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))

        for (const line of lines) {
          const data = line.replace('data: ', '')
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices[0].delta?.content || ''
            if (content) {
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + content,
                }
                return updated
              })
            }
          } catch {
            // skip malformed chunks
          }
        }
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: `Error: ${err.message}` }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="chat-wrapper">
      <div className="chat-header">
        <span className="chat-logo">⚡</span>
        <span>NVIDIA AI Chat</span>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">Ask me anything...</div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>
            <div className="bubble-label">{msg.role === 'user' ? 'You' : 'AI'}</div>
            <div className="bubble-text">{msg.content || <span className="typing">▍</span>}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-area">
        <textarea
          className="chat-input"
          rows={1}
          placeholder="Type a message... (Enter to send)"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button className="chat-send" onClick={sendMessage} disabled={loading || !input.trim()}>
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  )
}

export default App
