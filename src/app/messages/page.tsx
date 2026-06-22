'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function timeAgo(date: string) {
  const now = new Date()
  const d = new Date(date)
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago'
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

type Mode = 'builder' | 'hirer'

function MessagesInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const newProfileId = searchParams.get('new')
  const asParam = searchParams.get('as')

  const [activeMode, setActiveMode] = useState<Mode | null>(null)
  const [availableModes, setAvailableModes] = useState<{ builder: boolean; hirer: boolean }>({ builder: false, hirer: false })

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
  const desktopTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Resolve modes + initial active mode, then load conversations
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      const email = session.user.email || ''
      setUserEmail(email)
      userEmailRef.current = email

      // Derive modes client-side
      const now = new Date().toISOString()
      const [{ data: sub }, { data: profile }] = await Promise.all([
        supabase.from('subscriptions').select('id').eq('email', email).eq('status', 'active').eq('product', 'full_access').or(`expires_at.is.null,expires_at.gt.${now}`).maybeSingle(),
        supabase.from('profiles').select('id').eq('email', email).maybeSingle(),
      ])
      const metaRole = session.user.user_metadata?.role
      const builder = !!profile
      const hirer = !!sub

      // Client-mode-only users → redirect to /client/inbox (complementary forward gate per discovery doc D.5)
      if (!builder && !hirer && metaRole === 'client') {
        window.location.href = '/client/inbox'
        return
      }
      if (cancelled) return

      setAvailableModes({ builder, hirer })

      // Resolve active mode: ?as= param if valid for this user; else hirer > builder priority
      let resolved: Mode | null = null
      if (asParam === 'hirer' && hirer) resolved = 'hirer'
      else if (asParam === 'builder' && builder) resolved = 'builder'
      else if (hirer) resolved = 'hirer'
      else if (builder) resolved = 'builder'

      setActiveMode(resolved)
    }

    init()
    return () => { cancelled = true }
  }, [asParam])

  // Load conversations + open Realtime channel whenever active mode changes
  useEffect(() => {
    if (!activeMode) return
    const supabase = createClient()
    loadConversations(activeMode).then(() => {
      if (newProfileId && activeMode === 'hirer') handleNewConversation(newProfileId)
    })
    const channel = supabase
      .channel(`messages-${activeMode}`)
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
  }, [activeMode, newProfileId])

  useEffect(() => { selectedRef.current = selected }, [selected])
  useEffect(() => { userEmailRef.current = userEmail }, [userEmail])
  useEffect(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [messages])

  const loadConversations = async (mode: Mode) => {
    setLoading(true)
    const res = await fetch(`/api/messages?as=${mode}`)
    if (res.ok) { const { conversations } = await res.json(); setConversations(conversations) }
    setLoading(false)
  }

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

  const sendMessage = async (ref?: React.RefObject<HTMLTextAreaElement | null>) => {
    if (!input.trim() || !selected || sending) return
    setSending(true)
    const optimistic = { id: `temp-${Date.now()}`, conversation_id: selected.id, sender_email: userEmail, content: input.trim(), created_at: new Date().toISOString() }
    setMessages(prev => [...prev, optimistic])
    const text = input.trim()
    setInput('')
    if (ref?.current) ref.current.style.height = 'auto'
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    if (desktopTextareaRef.current) desktopTextareaRef.current.style.height = 'auto'
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight }), 50)
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

  const switchMode = (mode: Mode) => {
    setSelected(null)
    setMessages([])
    setView('list')
    setActiveMode(mode)
    router.replace(`/messages?as=${mode}`)
  }

  const builderForConv = (conv: any) => conv?.profiles || {}

  // Conversation card label/name depend on active mode:
  //   as=hirer  → render builder side (from conv.profiles)
  //   as=builder→ render hirer side (from conv.employer_profile / jobs — DB shape stays)
  const getConvLabel = (conv: any) => {
    if (activeMode === 'builder') {
      if (conv.conversation_type === 'project_inquiry') return { label: 'Project enquiry', color: '#6c63ff', bg: '#f0f0ff' }
      if (conv.conversation_type === 'job_application') return { label: 'Application', color: '#0071e3', bg: '#e8f1fd' }
    }
    return null
  }

  const getConvName = (conv: any) => {
    if (activeMode === 'hirer') {
      return builderForConv(conv).full_name || 'Builder'
    }
    return conv.employer_profile?.company_name || conv.jobs?.company_name || 'Confidential'
  }

  const msgBubble = (msg: any) => {
    const isMe = msg.sender_email === userEmail
    return (
      <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
        <div style={{ maxWidth: '78%', background: isMe ? '#0071e3' : '#f0f0f5', color: isMe ? 'white' : '#1d1d1f', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: '0.6rem 0.875rem', fontSize: 15, lineHeight: 1.45 }}>
          <p style={{ margin: 0 }}>{msg.content}</p>
          <p style={{ fontSize: 11, opacity: 0.5, marginTop: '0.2rem', textAlign: isMe ? 'right' : 'left', marginBottom: 0 }}>
            {timeAgo(msg.created_at)}{isMe && msg.read ? ' · Read' : ''}
          </p>
        </div>
      </div>
    )
  }

  const TabStrip = () => {
    if (!availableModes.builder || !availableModes.hirer) return null
    const tabStyle = (mode: Mode) => ({
      padding: '0.4rem 0.9rem',
      borderRadius: 980,
      fontSize: 13,
      fontWeight: 500,
      cursor: 'pointer' as const,
      border: 'none',
      fontFamily: 'inherit',
      background: activeMode === mode ? '#0071e3' : '#f5f5f7',
      color: activeMode === mode ? 'white' : '#1d1d1f',
    })
    return (
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button type="button" onClick={() => switchMode('builder')} style={tabStyle('builder')}>As builder</button>
        <button type="button" onClick={() => switchMode('hirer')} style={tabStyle('hirer')}>As hirer</button>
      </div>
    )
  }

  const convList = (onSelect: (c: any) => void) => (
    <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {loading ? <div style={{ padding: '2rem', textAlign: 'center', color: '#aeaeb2' }}>Loading...</div>
      : conversations.length === 0 ? (
        <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: 26, marginBottom: '0.75rem' }}>💬</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.3rem' }}>No conversations yet</p>
          {activeMode === 'hirer' ? (
            <>
              <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: '1rem' }}>Browse talent and message builders.</p>
              <a href="/talent" style={{ fontSize: 13, padding: '0.5rem 1rem', background: '#0071e3', color: 'white', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>Browse talent</a>
            </>
          ) : (
            <p style={{ fontSize: 13, color: '#6e6e73' }}>Hirers will message you when interested.</p>
          )}
        </div>
      ) : (
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {conversations.map(conv => {
            const builder = builderForConv(conv)
            const initials = builder.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'
            return (
              <div key={conv.id} onClick={() => onSelect(conv)}
                style={{ padding: '0.875rem 1.25rem', cursor: 'pointer', borderBottom: '0.5px solid #f0f0f5', background: selected?.id === conv.id ? '#f0f5ff' : 'white' }}>
                <div style={{ display: 'flex', gap: activeMode === 'hirer' ? '0.65rem' : 0, alignItems: 'flex-start' }}>
                  {activeMode === 'hirer' && (
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #e8f1fd, #d0e4fb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                      {builder.avatar_url ? <img src={builder.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 12, fontWeight: 700, color: '#0071e3' }}>{initials}</span>}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.1rem' }}>{getConvName(conv)}</p>
                        {conv.jobs?.role_title && <p style={{ fontSize: 12, color: '#0071e3', fontWeight: 500, marginBottom: '0.1rem' }}>Re: {conv.jobs.role_title}</p>}
                        {conv.last_message && <p style={{ fontSize: 13, color: '#6e6e73', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.last_message.content}</p>}
                      </div>
                      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                        {conv.last_message && <p style={{ fontSize: 11, color: '#aeaeb2' }}>{timeAgo(conv.last_message.created_at)}</p>}
                        {conv.unread_count > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: '#0071e3', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{conv.unread_count}</span>}
                      </div>
                    </div>
                    {(() => { const label = getConvLabel(conv); return label ? <span style={{ display: 'inline-block', marginTop: '0.25rem', fontSize: 10, fontWeight: 600, padding: '0.1rem 0.4rem', borderRadius: 980, background: label.bg, color: label.color }}>{label.label}</span> : null })()}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  // Auth-not-resolved / no-modes empty state
  if (!loading && !activeMode) {
    return (
      <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <p style={{ fontSize: 28, marginBottom: '0.75rem' }}>💬</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.4rem' }}>Subscribe to message builders</p>
          <p style={{ fontSize: 14, color: '#6e6e73', marginBottom: '1.25rem' }}>Get full access to the verified builder directory and message builders directly — $199/month.</p>
          <a href="/hirers#pricing" style={{ display: 'inline-block', padding: '0.7rem 1.5rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Get full access — $199/month</a>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @media (max-width: 640px) {
          .msgs-desktop { display: none !important; }
          .msgs-mobile { display: block !important; }
        }
        @media (min-width: 641px) {
          .msgs-mobile { display: none !important; }
          .msgs-desktop { display: block !important; }
        }
      `}</style>

      {/* ── MOBILE ── */}
      <div className="msgs-mobile" style={{
        background: '#fbfbfd',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        minHeight: 'calc(100vh - 52px)',
      }}>
        {view === 'list' ? (
          <div style={{ padding: '1rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#0071e3', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Messages</p>
              <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f' }}>Your inbox</h1>
            </div>
            <TabStrip />
            <div style={{ height: 'calc(100vh - 200px)' }}>{convList(openConversation)}</div>
          </div>
        ) : selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', background: 'white', minHeight: 'calc(100vh - 52px)' }}>
            <div style={{ background: 'white', borderBottom: '0.5px solid #e0e0e5', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'sticky', top: 52, zIndex: 10 }}>
              <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0071e3', fontSize: 20, padding: '0 0.25rem', lineHeight: 1 }}>←</button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getConvName(selected)}</p>
                {selected.jobs?.role_title && <p style={{ fontSize: 12, color: '#0071e3', fontWeight: 500 }}>Re: {selected.jobs.role_title}</p>}
              </div>
              {activeMode === 'hirer' && builderForConv(selected).username && <a href={`/u/${builderForConv(selected).username}`} target="_blank" style={{ fontSize: 11, padding: '0.25rem 0.6rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, textDecoration: 'none', fontWeight: 500, flexShrink: 0 }}>View</a>}
            </div>
            <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingBottom: '0.5rem' }}>
              {messages.map(msg => msgBubble(msg))}
              <div ref={messagesEndRef} />
            </div>
            <div style={{
              position: 'sticky',
              bottom: 0,
              background: 'white',
              borderTop: '0.5px solid #e0e0e5',
              padding: '0.625rem 0.875rem',
              paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'flex-end',
            }}>
              <textarea ref={textareaRef} value={input}
                onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px' }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(textareaRef) } }}
                placeholder="Message..."
                rows={1}
                style={{ flex: 1, padding: '0.55rem 0.875rem', border: 'none', borderRadius: 20, fontSize: 16, fontFamily: 'inherit', outline: 'none', resize: 'none', minHeight: 36, maxHeight: 96, background: '#f0f0f5' }}
              />
              <button onClick={() => sendMessage(textareaRef)} disabled={!input.trim() || sending}
                style={{ width: 36, height: 36, borderRadius: '50%', background: !input.trim() || sending ? '#d2d2d7' : '#0071e3', border: 'none', cursor: !input.trim() || sending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── DESKTOP ── */}
      <div className="msgs-desktop" style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '4rem 1.5rem 2rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#0071e3', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Messages</p>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f' }}>Your inbox</h1>
          </div>
          <TabStrip />
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1rem', height: 'calc(100vh - 260px)', minHeight: 500 }}>
            {convList(openConversation)}
            <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {!selected ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#aeaeb2' }}>
                  <p style={{ fontSize: 28 }}>💬</p>
                  <p style={{ fontSize: 14, marginTop: '0.5rem' }}>Select a conversation</p>
                </div>
              ) : (
                <>
                  <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid #e0e0e5', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{getConvName(selected)}</p>
                      {selected.jobs?.role_title && <p style={{ fontSize: 12, color: '#0071e3', fontWeight: 500 }}>Re: {selected.jobs.role_title}</p>}
                    </div>
                    {activeMode === 'hirer' && builderForConv(selected).username && <a href={`/u/${builderForConv(selected).username}`} target="_blank" style={{ fontSize: 12, padding: '0.3rem 0.75rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>View profile →</a>}
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {messages.map(msg => msgBubble(msg))}
                    <div ref={messagesEndRef} />
                  </div>
                  <div style={{ borderTop: '0.5px solid #e0e0e5', padding: '0.875rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <textarea ref={desktopTextareaRef} value={input}
                      onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(desktopTextareaRef) } }}
                      placeholder="Write a message... (Enter to send)"
                      rows={1}
                      style={{ flex: 1, padding: '0.6rem 0.875rem', border: '1px solid #d2d2d7', borderRadius: 12, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'none', minHeight: 40, maxHeight: 120 }}
                    />
                    <button onClick={() => sendMessage(desktopTextareaRef)} disabled={!input.trim() || sending}
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
    </>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#fbfbfd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#aeaeb2' }}>Loading...</p></div>}>
      <MessagesInner />
    </Suspense>
  )
}
