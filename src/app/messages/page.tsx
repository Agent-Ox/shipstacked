'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUserEmail(session.user.email || '')
    })
    loadConversations()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadConversations = async () => {
    setLoading(true)
    const res = await fetch('/api/messages')
    if (res.ok) {
      const { conversations } = await res.json()
      setConversations(conversations)
    }
    setLoading(false)
  }

  const openConversation = async (conv: any) => {
    setSelected(conv)
    const res = await fetch(`/api/messages/${conv.id}`)
    if (res.ok) {
      const { messages } = await res.json()
      setMessages(messages)
      // Mark as read in local state
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c))
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || !selected || sending) return
    setSending(true)
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: selected.id, content: input.trim() }),
    })
    if (res.ok) {
      const { message } = await res.json()
      setMessages(prev => [...prev, message])
      setInput('')
      setConversations(prev => prev.map(c => c.id === selected.id
        ? { ...c, last_message: message, last_message_at: message.created_at }
        : c
      ))
    }
    setSending(false)
  }

  const otherPartyName = (conv: any) => conv.employer_email || 'Employer'

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '4rem 1.5rem 2rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#0071e3', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Messages</p>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f' }}>Your inbox</h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1rem', height: 'calc(100vh - 180px)', minHeight: 500 }}>

          {/* Conversation list */}
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Loading...</div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ fontSize: 28, marginBottom: '0.75rem' }}>💬</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.3rem' }}>No messages yet</p>
                <p style={{ fontSize: 13, color: '#6e6e73' }}>Employers will message you here when they're interested.</p>
              </div>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {conversations.map(conv => (
                  <div key={conv.id} onClick={() => openConversation(conv)}
                    style={{
                      padding: '1rem 1.25rem', cursor: 'pointer',
                      borderBottom: '0.5px solid #f0f0f5',
                      background: selected?.id === conv.id ? '#f0f5ff' : 'white',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (selected?.id !== conv.id) e.currentTarget.style.background = '#fafafa' }}
                    onMouseLeave={e => { if (selected?.id !== conv.id) e.currentTarget.style.background = 'white' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {otherPartyName(conv)}
                        </p>
                        {conv.jobs?.role_title && (
                          <p style={{ fontSize: 11, color: '#0071e3', fontWeight: 500, marginBottom: '0.2rem' }}>{conv.jobs.role_title}</p>
                        )}
                        {conv.last_message && (
                          <p style={{ fontSize: 12, color: '#6e6e73', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {conv.last_message.content}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', flexShrink: 0 }}>
                        {conv.last_message && (
                          <p style={{ fontSize: 11, color: '#aeaeb2' }}>{timeAgo(conv.last_message.created_at)}</p>
                        )}
                        {conv.unread_count > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 700, background: '#0071e3', color: 'white', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Thread */}
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {!selected ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.5rem', color: '#aeaeb2' }}>
                <p style={{ fontSize: 28 }}>💬</p>
                <p style={{ fontSize: 14 }}>Select a conversation</p>
              </div>
            ) : (
              <>
                {/* Thread header */}
                <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid #e0e0e5', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{otherPartyName(selected)}</p>
                    {selected.jobs?.role_title && (
                      <p style={{ fontSize: 12, color: '#0071e3', fontWeight: 500 }}>Re: {selected.jobs.role_title}</p>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {messages.map(msg => {
                    const isMe = msg.sender_email === userEmail
                    return (
                      <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '75%',
                          background: isMe ? '#0071e3' : '#f5f5f7',
                          color: isMe ? 'white' : '#1d1d1f',
                          borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          padding: '0.65rem 1rem',
                          fontSize: 14,
                          lineHeight: 1.5,
                        }}>
                          <p>{msg.content}</p>
                          <p style={{ fontSize: 11, opacity: 0.6, marginTop: '0.25rem', textAlign: isMe ? 'right' : 'left' }}>{timeAgo(msg.created_at)}</p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div style={{ padding: '0.875rem', borderTop: '0.5px solid #e0e0e5', display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <textarea
                    value={input}
                    onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    placeholder="Write a message..."
                    rows={1}
                    style={{ flex: 1, padding: '0.6rem 0.875rem', border: '1px solid #d2d2d7', borderRadius: 12, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'none', minHeight: 40, maxHeight: 120 }}
                  />
                  <button onClick={sendMessage} disabled={!input.trim() || sending}
                    style={{ width: 38, height: 38, borderRadius: 10, background: !input.trim() || sending ? '#d2d2d7' : '#0071e3', border: 'none', cursor: !input.trim() || sending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M22 2L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
