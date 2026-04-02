'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export default function Scout() {
  const [open, setOpen] = useState(false)
  const [isEmployer, setIsEmployer] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      const role = session.user.user_metadata?.role
      if (role === 'employer' || role === 'builder') setIsEmployer(true)
      setUserRole(role || '')
    })
  }, [])

  useEffect(() => {
    if (open && messages.length === 0) {
      if (userRole === 'builder') {
        // Hardcoded greeting — instant, no API call needed
        setMessages([{
          role: 'assistant',
          content: "Hey — I know your profile. Ask me who's hiring for your skills and I'll find your best matches."
        }])
      } else {
        // Employer greeting — personalised via API
        setLoading(true)
        fetch('/api/scout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'user', content: '__EMPLOYER_GREETING__' }] })
        }).then(async res => {
          if (!res.body) return
          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          let text = ''
          setMessages([{ role: 'assistant', content: '' }])
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            text += decoder.decode(value, { stream: true })
            setMessages([{ role: 'assistant', content: text }])
          }
          setLoading(false)
        }).catch(() => {
          setMessages([{ role: 'assistant', content: "Hey — I know your listings. Ask me to find builders for any of your roles." }])
          setLoading(false)
        })
      }
    }
  }, [open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      })

      if (!res.ok) throw new Error('Scout failed to respond')
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantText += decoder.decode(value, { stream: true })
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: assistantText }
          return updated
        })
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, something went wrong. Please try again."
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const formatMessage = (text: string) => {
    // Convert URLs to clickable links
    const urlRegex = /(claudhire\.com\/u\/[^\s,)]+)/g
    const parts = text.split(urlRegex)
    return parts.map((part, i) => {
      if (urlRegex.test(part)) {
        urlRegex.lastIndex = 0
        return (
          <a key={i} href={`https://${part}`} target="_blank"
            style={{ color: '#6c63ff', textDecoration: 'none', fontWeight: 500, borderBottom: '1px solid rgba(108,99,255,0.3)' }}>
            {part}
          </a>
        )
      }
      // Bold **text**
      const boldParts = part.split(/\*\*(.*?)\*\*/g)
      return boldParts.map((bp, j) => j % 2 === 1 ? <strong key={j}>{bp}</strong> : bp)
    })
  }

  const isSignupFlow = typeof window !== 'undefined' && (window.location.pathname === '/join' || window.location.pathname === '/signup')
  if (!mounted || !isEmployer || isSignupFlow) return null

  return (
    <>
      <style>{`
        @keyframes scout-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(108,99,255,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(108,99,255,0); }
        }
        @keyframes scout-slide-up {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes scout-dot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        .scout-bubble {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6c63ff, #a78bfa);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(108,99,255,0.4);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          animation: scout-pulse 3s ease infinite;
        }
        .scout-bubble:hover {
          transform: scale(1.08);
          box-shadow: 0 6px 28px rgba(108,99,255,0.5);
          animation: none;
        }
        .scout-panel {
          position: fixed;
          bottom: 88px;
          right: 24px;
          z-index: 9998;
          width: 380px;
          height: 560px;
          background: #0f0f18;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(108,99,255,0.15);
          animation: scout-slide-up 0.25s ease forwards;
          overflow: hidden;
        }
        @media (max-width: 480px) {
          .scout-panel {
            right: 12px;
            left: 12px;
            width: auto;
            bottom: 80px;
            height: calc(100vh - 140px);
            max-height: 580px;
          }
          .scout-bubble {
            bottom: 16px;
            right: 16px;
          }
        }
        .scout-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
          scroll-behavior: smooth;
        }
        .scout-messages::-webkit-scrollbar { width: 4px; }
        .scout-messages::-webkit-scrollbar-track { background: transparent; }
        .scout-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        .scout-msg-user {
          align-self: flex-end;
          background: linear-gradient(135deg, #6c63ff, #8b5cf6);
          color: white;
          padding: 0.65rem 1rem;
          border-radius: 16px 16px 4px 16px;
          font-size: 14px;
          line-height: 1.5;
          max-width: 85%;
          word-break: break-word;
        }
        .scout-msg-assistant {
          align-self: flex-start;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(240,240,245,0.9);
          padding: 0.65rem 1rem;
          border-radius: 16px 16px 16px 4px;
          font-size: 14px;
          line-height: 1.6;
          max-width: 90%;
          word-break: break-word;
        }
        .scout-typing {
          align-self: flex-start;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          padding: 0.75rem 1rem;
          border-radius: 16px 16px 16px 4px;
          display: flex;
          gap: 5px;
          align-items: center;
        }
        .scout-dot {
          width: 6px;
          height: 6px;
          background: rgba(167,139,250,0.8);
          border-radius: 50%;
          animation: scout-dot 1.4s ease infinite;
        }
        .scout-dot:nth-child(2) { animation-delay: 0.2s; }
        .scout-dot:nth-child(3) { animation-delay: 0.4s; }
        .scout-input-area {
          padding: 0.875rem;
          border-top: 1px solid rgba(255,255,255,0.07);
          display: flex;
          gap: 0.5rem;
          align-items: flex-end;
          background: rgba(0,0,0,0.2);
        }
        .scout-textarea {
          flex: 1;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          color: rgba(240,240,245,0.9);
          font-size: 14px;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 0.6rem 0.875rem;
          resize: none;
          outline: none;
          line-height: 1.5;
          min-height: 40px;
          max-height: 120px;
          transition: border-color 0.2s;
        }
        .scout-textarea::placeholder { color: rgba(255,255,255,0.25); }
        .scout-textarea:focus { border-color: rgba(108,99,255,0.5); }
        .scout-send {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #6c63ff, #8b5cf6);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: opacity 0.2s, transform 0.15s;
        }
        .scout-send:hover { opacity: 0.9; transform: scale(1.05); }
        .scout-send:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
      `}</style>

      {/* Floating bubble */}
      <button className="scout-bubble" onClick={() => setOpen(!open)} aria-label="Open Scout">
        {open ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 2L16 16M16 2L2 16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2"/>
            <path d="M16.5 16.5L21 21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="scout-panel" ref={panelRef}>

          {/* Header */}
          <div style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'rgba(108,99,255,0.08)',
          }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2"/>
                <path d="M16.5 16.5L21 21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(240,240,245,0.95)', letterSpacing: '-0.01em' }}>Scout</p>
              <p style={{ fontSize: 11, color: 'rgba(167,139,250,0.8)', fontWeight: 500 }}>ClaudHire talent concierge</p>
            </div>
            <button
              onClick={() => { setMessages([]); setOpen(false) }}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 4, borderRadius: 6, display: 'flex', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="scout-messages">
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === 'user' ? 'scout-msg-user' : 'scout-msg-assistant'}>
                {msg.role === 'assistant' && msg.content === '' ? (
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center', minHeight: 20 }}>
                    <div className="scout-dot" />
                    <div className="scout-dot" />
                    <div className="scout-dot" />
                  </div>
                ) : (
                  <span>{formatMessage(msg.content)}</span>
                )}
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="scout-typing">
                <div className="scout-dot" />
                <div className="scout-dot" />
                <div className="scout-dot" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="scout-input-area">
            <textarea
              ref={inputRef}
              className="scout-textarea"
              placeholder={userRole === "builder" ? "Who is hiring for my skills right now..." : "Find me a RAG engineer in Europe..."}
              value={input}
              onChange={e => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button className="scout-send" onClick={send} disabled={!input.trim() || loading}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

        </div>
      )}
    </>
  )
}
