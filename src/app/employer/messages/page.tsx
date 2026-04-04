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

export default function EmployerMessagesPage() {
  const [conversations, setConversations] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<any>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUserEmail(session.user.email || '')
    })
    loadConversations()

    // Supabase Realtime
    const channel = supabase
      .channel('employer-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const newMsg = payload.new as any
        if (selectedRef.current && newMsg.conversation_id === selectedRef.current.id) {
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          fetch(`/api/messages/${selectedRef.current.id}`, { method: 'GET' }).catch(() => {})
        }
        setConversations(prev => prev.map(c =>
          c.id === newMsg.conversation_id
            ? { ...c, last_message: newMsg, unread_count: selectedRef.current?.id === c.id ? 0 : (c.unread_count || 0) + 1 }
            : c
        ))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => { selectedRef.current = selected }, [selected])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

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
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c))
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || !selected || sending) return
    setSending(true)
    const optimistic = { id: `temp-${Date.now()}`, conversation_id: selected.id, sender_email: userEmail, content: input.trim(), created_at: new Date().toISOString(), read: false }
    setMessages(prev => [...prev, optimistic])
    const text = input.trim()
    setInput('')

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: selected.id, content: text }),
    })
    if (res.ok) {
      const { message } = await res.json()
      setMessages(prev => prev.map(m => m.id === optimistic.id ? message : m))
    } else {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    }
    setSending(false)
  }

  const builder = (conv: any) => conv.profiles || {}

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '4rem 1.5rem 2rem' }}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#0071e3', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Messages</p>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f' }}>Conversations</h1>
          </div>
          <a href="/talent" style={{ fontSize: 13, padding: '0.5rem 1rem', background: '#0071e3', color: 'white', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>Browse talent →</a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1rem', height: 'calc(100vh - 200px)', minHeight: 500 }}>

          {/* Conversation list */}
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Loading...</div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ fontSize: 28, marginBottom: '0.75rem' }}>💬</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.3rem' }}>No conversations yet</p>
                <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: '1rem' }}>Browse talent and message builders you're interested in.</p>
                <a href="/talent" style={{ fontSize: 13, padding: '0.5rem 1rem', background: '#0071e3', color: 'white', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>Browse talent</a>
              </div>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {conversations.map(conv => {
                  const b = builder(conv)
                  const initials = b.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'
                  return (
                    <div key={conv.id} onClick={() => openConversation(conv)}
                      style={{ padding: '1rem 1.25rem', cursor: 'pointer', borderBottom: '0.5px solid #f0f0f5', background: selected?.id === conv.id ? '#f0f5ff' : 'white', transition: 'background 0.15s' }}
                      onMouseEnter={e => { if (selected?.id !== conv.id) e.currentTarget.style.background = '#fafafa' }}
                      onMouseLeave={e => { if (selected?.id !== conv.id) e.currentTarget.style.background = 'white' }}
                    >
                      <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #e8f1fd, #d0e4fb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                          {b.avatar_url ? <img src={b.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 12, fontWeight: 700, color: '#0071e3' }}>{initials}</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.full_name || 'Builder'}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                              {conv.last_message && <p style={{ fontSize: 11, color: '#aeaeb2' }}>{timeAgo(conv.last_message.created_at)}</p>}
                              {conv.unread_count > 0 && (
                                <span style={{ fontSize: 11, fontWeight: 700, background: '#0071e3', color: 'white', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{conv.unread_count}</span>
                              )}
                            </div>
                          </div>
                          {conv.jobs?.role_title && <p style={{ fontSize: 11, color: '#0071e3', fontWeight: 500 }}>Re: {conv.jobs.role_title}</p>}
                          {conv.last_message && <p style={{ fontSize: 12, color: '#6e6e73', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.1rem' }}>{conv.last_message.content}</p>}
                        </div>
                      </div>
                    </div>
                  )
                })}
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
                <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid #e0e0e5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {(() => {
                    const b = builder(selected)
                    const initials = b.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #e8f1fd, #d0e4fb)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                          {b.avatar_url ? <img src={b.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 11, fontWeight: 700, color: '#0071e3' }}>{initials}</span>}
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{b.full_name}</p>
                          {selected.jobs?.role_title && <p style={{ fontSize: 12, color: '#0071e3', fontWeight: 500 }}>Re: {selected.jobs.role_title}</p>}
                        </div>
                      </div>
                    )
                  })()}
                  {builder(selected).username && (
                    <a href={`/u/${builder(selected).username}`} target="_blank"
                      style={{ fontSize: 12, padding: '0.3rem 0.75rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>
                      View profile →
                    </a>
                  )}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {messages.map(msg => {
                    const isMe = msg.sender_email === userEmail
                    return (
                      <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{ maxWidth: '75%', background: isMe ? '#0071e3' : '#f5f5f7', color: isMe ? 'white' : '#1d1d1f', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '0.65rem 1rem', fontSize: 14, lineHeight: 1.5 }}>
                          <p>{msg.content}</p>
                          <p style={{ fontSize: 11, opacity: 0.6, marginTop: '0.25rem', textAlign: isMe ? 'right' : 'left' }}>{timeAgo(msg.created_at)}</p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div style={{ padding: '0.875rem', borderTop: '0.5px solid #e0e0e5', display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <textarea value={input}
                    onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    placeholder="Write a message... (Enter to send)"
                    rows={1}
                    style={{ flex: 1, padding: '0.6rem 0.875rem', border: '1px solid #d2d2d7', borderRadius: 12, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'none', minHeight: 40, maxHeight: 120 }}
                  />
                  <button onClick={sendMessage} disabled={!input.trim() || sending}
                    style={{ width: 38, height: 38, borderRadius: 10, background: !input.trim() || sending ? '#d2d2d7' : '#0071e3', border: 'none', cursor: !input.trim() || sending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
