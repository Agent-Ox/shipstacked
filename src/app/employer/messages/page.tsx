'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function EmployerMessagesInner() {
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
  const searchParams = useSearchParams()
  const newProfileId = searchParams.get('new')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setUserEmail(session.user.email || ''); userEmailRef.current = session.user.email || '' }
    })
    loadConversations().then(() => {
      if (newProfileId) handleNewConversation(newProfileId)
    })

    const channel = supabase
      .channel('employer-messages')
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

  const handleNewConversation = async (profileId: string) => {
    const res = await fetch(`/api/messages?new=${profileId}`)
    if (res.ok) {
      const data = await res.json()
      if (data.conversation) {
        setConversations(prev => prev.some(c => c.id === data.conversation.id) ? prev : [data.conversation, ...prev])
        setSelected(data.conversation)
        setView('thread')
        const msgRes = await fetch(`/api/messages/${data.conversation.id}`)
        if (msgRes.ok) { const { messages } = await msgRes.json(); setMessages(messages) }
      }
    }
  }

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

  const b = (conv: any) => conv?.profiles || {}

  // THREAD VIEW — fixed position, no scroll interference
  if (view === 'thread' && selected) {
    const builder = b(selected)
    const initials = builder.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'white', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', zIndex: 10 }}>
        {/* Header */}
        <div style={{ padding: '0.875rem 1rem', borderBottom: '0.5px solid #e0e0e5', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'white', paddingTop: 'calc(0.875rem + env(safe-area-inset-top))', flexShrink: 0 }}>
          <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#0071e3', padding: '0 0.25rem', fontFamily: 'inherit' }}>←</button>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #e8f1fd, #d0e4fb)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
            {builder.avatar_url ? <img src={builder.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 11, fontWeight: 700, color: '#0071e3' }}>{initials}</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{builder.full_name || 'Builder'}</p>
            {selected.jobs?.role_title && <p style={{ fontSize: 12, color: '#0071e3', fontWeight: 500 }}>Re: {selected.jobs.role_title}</p>}
          </div>
          {builder.username && (
            <a href={`/u/${builder.username}`} target="_blank" style={{ fontSize: 12, padding: '0.3rem 0.65rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, textDecoration: 'none', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>View →</a>
          )}
        </div>

        {/* Messages */}
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

        {/* Input */}
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

  const ConvItem = ({ conv }: { conv: any }) => {
    const builder = b(conv)
    const initials = builder.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'
    return (
      <div onClick={() => openConversation(conv)}
        style={{ padding: '1rem 1.25rem', cursor: 'pointer', borderBottom: '0.5px solid #f0f0f5', background: selected?.id === conv.id ? '#f0f5ff' : 'white', transition: 'background 0.1s' }}
        onMouseEnter={e => { if (selected?.id !== conv.id) e.currentTarget.style.background = '#f5f5f7' }}
        onMouseLeave={e => { if (selected?.id !== conv.id) e.currentTarget.style.background = 'white' }}
      >
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #e8f1fd, #d0e4fb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            {builder.avatar_url ? <img src={builder.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 12, fontWeight: 700, color: '#0071e3' }}>{initials}</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{builder.full_name || 'Builder'}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                {conv.last_message && <p style={{ fontSize: 11, color: '#aeaeb2' }}>{timeAgo(conv.last_message.created_at)}</p>}
                {conv.unread_count > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: '#0071e3', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{conv.unread_count}</span>}
              </div>
            </div>
            {conv.jobs?.role_title && <p style={{ fontSize: 12, color: '#0071e3', fontWeight: 500 }}>Re: {conv.jobs.role_title}</p>}
            {conv.last_message && <p style={{ fontSize: 13, color: '#6e6e73', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.1rem' }}>{conv.last_message.content}</p>}
          </div>
        </div>
      </div>
    )
  }

  const ConvList = () => (
    <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {loading ? <div style={{ padding: '2rem', textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Loading...</div>
      : conversations.length === 0 ? (
        <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <p style={{ fontSize: 28, marginBottom: '0.75rem' }}>💬</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.3rem' }}>No conversations yet</p>
          <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: '1rem' }}>Browse talent and message builders.</p>
          <a href="/talent" style={{ fontSize: 13, padding: '0.5rem 1rem', background: '#0071e3', color: 'white', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>Browse talent</a>
        </div>
      ) : <div style={{ overflowY: 'auto', flex: 1 }}>{conversations.map(conv => <ConvItem key={conv.id} conv={conv} />)}</div>}
    </div>
  )

  const DesktopThread = () => {
    const builder = selected ? b(selected) : {}
    const initials = builder.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'
    return (
      <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#aeaeb2' }}>
            <p style={{ fontSize: 28 }}>💬</p>
            <p style={{ fontSize: 14, marginTop: '0.5rem' }}>Select a conversation</p>
          </div>
        ) : (
          <>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid #e0e0e5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #e8f1fd, #d0e4fb)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {builder.avatar_url ? <img src={builder.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 11, fontWeight: 700, color: '#0071e3' }}>{initials}</span>}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{builder.full_name}</p>
                  {selected.jobs?.role_title && <p style={{ fontSize: 12, color: '#0071e3', fontWeight: 500 }}>Re: {selected.jobs.role_title}</p>}
                </div>
              </div>
              {builder.username && <a href={`/u/${builder.username}`} target="_blank" style={{ fontSize: 12, padding: '0.3rem 0.75rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>View profile →</a>}
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
              <textarea ref={textareaRef} value={input}
                onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder="Write a message..."
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
  }

  const Header = () => (
    <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#0071e3', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Messages</p>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f' }}>Conversations</h1>
      </div>
      <a href="/talent" style={{ fontSize: 13, padding: '0.5rem 1rem', background: '#0071e3', color: 'white', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>Browse talent →</a>
    </div>
  )

  // LIST VIEW
  return (
    <>
      <div className="emp-mobile" style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '4rem 1.5rem 2rem' }}>
          <Header />
          <ConvList />
        </div>
      </div>
      <div className="emp-desktop" style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '4rem 1.5rem 2rem' }}>
          <Header />
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1rem', height: 'calc(100vh - 220px)', minHeight: 500 }}>
            <ConvList />
            <DesktopThread />
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 640px) { .emp-desktop { display: none !important; } .emp-mobile { display: block !important; } }
        @media (min-width: 641px) { .emp-mobile { display: none !important; } .emp-desktop { display: block !important; } }
      `}</style>
    </>
  )
}

export default function EmployerMessagesPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#fbfbfd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#aeaeb2' }}>Loading...</p></div>}>
      <EmployerMessagesInner />
    </Suspense>
  )
}
