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
  const [view, setView] = useState<'list' | 'thread'>('list')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<any>(null)
  const userEmailRef = useRef<string>('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setUserEmail(session.user.email || ''); userEmailRef.current = session.user.email || '' }
    })
    loadConversations()

    const channel = supabase
      .channel('builder-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new as any
        if (newMsg.sender_email === userEmailRef.current) return
        if (selectedRef.current && newMsg.conversation_id === selectedRef.current.id) {
          setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg])
        }
        setConversations(prev => prev.map(c => c.id === newMsg.conversation_id
          ? { ...c, last_message: newMsg, unread_count: selectedRef.current?.id === c.id ? 0 : (c.unread_count || 0) + 1 }
          : c))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => { selectedRef.current = selected }, [selected])
  useEffect(() => { userEmailRef.current = userEmail }, [userEmail])
  useEffect(() => {
    if (view === 'thread') {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [messages, view])

  const loadConversations = async () => {
    setLoading(true)
    const res = await fetch('/api/messages')
    if (res.ok) { const { conversations } = await res.json(); setConversations(conversations) }
    setLoading(false)
  }

  const openConversation = async (conv: any) => {
    setSelected(conv)
    setView('thread')
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
    const optimistic = { id: `temp-${Date.now()}`, conversation_id: selected.id, sender_email: userEmail, content: input.trim(), created_at: new Date().toISOString() }
    setMessages(prev => [...prev, optimistic])
    const text = input.trim()
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
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

  const getConvName = (conv: any) => conv.employer_profile?.company_name || conv.jobs?.company_name || conv.employer_email?.split('@')[0] || 'Employer'

  // THREAD VIEW
  if (view === 'thread' && selected) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'white', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', zIndex: 10 }}>
        {/* Header */}
        <div style={{ padding: '0.875rem 1rem', borderBottom: '0.5px solid #e0e0e5', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'white', paddingTop: 'calc(0.875rem + env(safe-area-inset-top))', flexShrink: 0 }}>
          <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#0071e3', padding: '0 0.25rem', fontFamily: 'inherit' }}>←</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getConvName(selected)}</p>
            {selected.jobs?.role_title && <p style={{ fontSize: 12, color: '#0071e3', fontWeight: 500 }}>Re: {selected.jobs.role_title}</p>}
          </div>
        </div>

        {/* Messages — scrollable middle */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', WebkitOverflowScrolling: 'touch' } as any}>
          {messages.map(msg => {
            const isMe = msg.sender_email === userEmail
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '80%', background: isMe ? '#0071e3' : '#f0f0f5', color: isMe ? 'white' : '#1d1d1f', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: '0.625rem 0.875rem', fontSize: 15, lineHeight: 1.45 }}>
                  <p style={{ margin: 0 }}>{msg.content}</p>
                  <p style={{ fontSize: 11, opacity: 0.55, marginTop: '0.2rem', textAlign: isMe ? 'right' : 'left' }}>{timeAgo(msg.created_at)}</p>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input — fixed at bottom */}
        <div style={{ borderTop: '0.5px solid #e0e0e5', padding: '0.625rem 1rem', paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom))', paddingRight: '1rem', background: 'white', display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexShrink: 0 }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px' }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Message..."
            rows={1}
            style={{ flex: 1, padding: '0.6rem 0.875rem', border: '1px solid #d2d2d7', borderRadius: 20, fontSize: 15, fontFamily: 'inherit', outline: 'none', resize: 'none', minHeight: 38, maxHeight: 100, background: '#f5f5f7' }}
          />
          <button onClick={sendMessage} disabled={!input.trim() || sending}
            style={{ width: 36, height: 36, borderRadius: '50%', background: !input.trim() || sending ? '#d2d2d7' : '#0071e3', border: 'none', cursor: !input.trim() || sending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>
    )
  }

  const ConvList = ({ onSelect }: { onSelect: (conv: any) => void }) => (
    <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Loading...</div>
      ) : conversations.length === 0 ? (
        <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <p style={{ fontSize: 28, marginBottom: '0.75rem' }}>💬</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.3rem' }}>No messages yet</p>
          <p style={{ fontSize: 13, color: '#6e6e73' }}>Employers will message you here when they're interested.</p>
        </div>
      ) : (
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {conversations.map(conv => (
            <div key={conv.id} onClick={() => onSelect(conv)}
              style={{ padding: '1rem 1.25rem', cursor: 'pointer', borderBottom: '0.5px solid #f0f0f5', background: selected?.id === conv.id ? '#f0f5ff' : 'white', transition: 'background 0.1s' }}
              onMouseEnter={e => { if (selected?.id !== conv.id) e.currentTarget.style.background = '#f5f5f7' }}
              onMouseLeave={e => { if (selected?.id !== conv.id) e.currentTarget.style.background = 'white' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.1rem' }}>{getConvName(conv)}</p>
                  {conv.jobs?.role_title && <p style={{ fontSize: 12, color: '#0071e3', fontWeight: 500, marginBottom: '0.1rem' }}>Re: {conv.jobs.role_title}</p>}
                  {conv.last_message && <p style={{ fontSize: 13, color: '#6e6e73', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.last_message.content}</p>}
                </div>
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
                  {conv.last_message && <p style={{ fontSize: 11, color: '#aeaeb2' }}>{timeAgo(conv.last_message.created_at)}</p>}
                  {conv.unread_count > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: '#0071e3', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{conv.unread_count}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const DesktopThread = () => (
    <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
      {!selected ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#aeaeb2' }}>
          <p style={{ fontSize: 28 }}>💬</p>
          <p style={{ fontSize: 14, marginTop: '0.5rem' }}>Select a conversation</p>
        </div>
      ) : (
        <>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid #e0e0e5' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{getConvName(selected)}</p>
            {selected.jobs?.role_title && <p style={{ fontSize: 12, color: '#0071e3', fontWeight: 500 }}>Re: {selected.jobs.role_title}</p>}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {messages.map(msg => {
              const isMe = msg.sender_email === userEmail
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '75%', background: isMe ? '#0071e3' : '#f0f0f5', color: isMe ? 'white' : '#1d1d1f', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '0.65rem 1rem', fontSize: 14, lineHeight: 1.5 }}>
                    <p>{msg.content}</p>
                    <p style={{ fontSize: 11, opacity: 0.55, marginTop: '0.2rem', textAlign: isMe ? 'right' : 'left' }}>{timeAgo(msg.created_at)}</p>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
          <div style={{ borderTop: '0.5px solid #e0e0e5', padding: '0.875rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
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
  )

  // LIST VIEW — mobile shows list, desktop shows split pane
  return (
    <>
      {/* Mobile: list only, thread handled by fixed-position view above */}
      <div className="mobile-only" style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '4rem 1.5rem 2rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#0071e3', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Messages</p>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f' }}>Your inbox</h1>
          </div>
          <ConvList onSelect={openConversation} />
        </div>
      </div>

      {/* Desktop: split pane */}
      <div className="desktop-only" style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '4rem 1.5rem 2rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#0071e3', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Messages</p>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f' }}>Your inbox</h1>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1rem', height: 'calc(100vh - 220px)', minHeight: 500 }}>
            <ConvList onSelect={openConversation} />
            <DesktopThread />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) { .desktop-only { display: none !important; } .mobile-only { display: block !important; } }
        @media (min-width: 641px) { .mobile-only { display: none !important; } .desktop-only { display: block !important; } }
      `}</style>
    </>
  )
}