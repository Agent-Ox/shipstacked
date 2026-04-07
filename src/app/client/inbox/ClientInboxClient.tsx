'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

function timeAgo(date: string) {
  const now = new Date()
  const d = new Date(date)
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago'
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

export default function ClientInboxClient({ userEmail, userName }: { userEmail: string, userName: string }) {
  const [conversations, setConversations] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'thread'>('list')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<any>(null)
  const userEmailRef = useRef<string>(userEmail)

  useEffect(() => {
    userEmailRef.current = userEmail
  }, [userEmail])

  useEffect(() => {
    selectedRef.current = selected
  }, [selected])

  useEffect(() => {
    loadConversations()
    const supabase = createClient()
    const channel = supabase
      .channel('client-inbox-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new as any
        if (newMsg.sender_email === userEmailRef.current) return
        if (selectedRef.current && newMsg.conversation_id === selectedRef.current.id) {
          setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg])
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        }
        setConversations(prev => prev.map(c =>
          c.id === newMsg.conversation_id
            ? { ...c, last_message_at: newMsg.created_at }
            : c
        ))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadConversations = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('conversations')
      .select(`*, profiles!builder_profile_id(full_name, avatar_url, username, role)`)
      .eq('client_email', userEmail)
      .order('last_message_at', { ascending: false })
    setConversations(data || [])
    setLoading(false)
  }

  const openConversation = async (conv: any) => {
    setSelected(conv)
    selectedRef.current = conv
    setView('thread')
    const supabase = createClient()
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const sendMessage = async () => {
    if (!input.trim() || !selected || sending) return
    setSending(true)
    const supabase = createClient()
    await supabase.from('messages').insert({
      conversation_id: selected.id,
      sender_email: userEmail,
      content: input.trim(),
      read: false,
    })
    await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', selected.id)
    setInput('')
    setSending(false)
    const { data } = await supabase.from('messages').select('*').eq('conversation_id', selected.id).order('created_at', { ascending: true })
    setMessages(data || [])
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const s = { fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }

  return (
    <div style={{ ...s, minHeight: '100vh', background: '#fbfbfd' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Your enquiries
          </h1>
          <p style={{ fontSize: 14, color: '#6e6e73' }}>Project conversations with builders on ShipStacked</p>
        </div>

        {loading ? (
          <p style={{ color: '#6e6e73', fontSize: 14 }}>Loading...</p>
        ) : conversations.length === 0 ? (
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '3rem', textAlign: 'center' }}>
            <p style={{ fontSize: 15, color: '#6e6e73', marginBottom: '1rem' }}>No enquiries yet.</p>
            <Link href="/feed" style={{ fontSize: 14, color: '#0071e3', textDecoration: 'none', fontWeight: 500 }}>
              Browse the Build Feed →
            </Link>
          </div>
        ) : view === 'list' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {conversations.map((conv: any) => {
              const builder = conv.profiles as any
              const initials = builder?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'
              return (
                <div key={conv.id} onClick={() => openConversation(conv)}
                  style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #e8f1fd, #d0e4fb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                    {builder?.avatar_url
                      ? <img src={builder.avatar_url} alt={builder.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 15, fontWeight: 700, color: '#0071e3' }}>{initials}</span>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{builder?.full_name}</p>
                      <span style={{ fontSize: 12, color: '#aeaeb2' }}>{timeAgo(conv.last_message_at)}</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#6e6e73' }}>{builder?.role || 'Builder'}</p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div>
            <button onClick={() => setView('list')}
              style={{ fontSize: 13, color: '#6e6e73', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1.5rem', padding: 0, fontFamily: 'inherit' }}>
              ← Back to enquiries
            </button>
            <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, overflow: 'hidden' }}>
              {/* Thread header */}
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e5', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #e8f1fd, #d0e4fb)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {(selected?.profiles as any)?.avatar_url
                    ? <img src={(selected?.profiles as any)?.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 13, fontWeight: 700, color: '#0071e3' }}>{(selected?.profiles as any)?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}</span>
                  }
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{(selected?.profiles as any)?.full_name}</p>
                  <p style={{ fontSize: 12, color: '#6e6e73' }}>Project enquiry</p>
                </div>
              </div>

              {/* Messages */}
              <div style={{ padding: '1.25rem', minHeight: 200, maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {messages.map((msg: any) => {
                  const isMe = msg.sender_email === userEmail
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '75%', padding: '0.625rem 0.875rem', borderRadius: 12,
                        background: isMe ? '#1d1d1f' : '#f5f5f7',
                        color: isMe ? 'white' : '#1d1d1f',
                        fontSize: 14, lineHeight: 1.5,
                      }}>
                        {msg.content}
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '1rem', borderTop: '1px solid #e0e0e5', display: 'flex', gap: '0.5rem' }}>
                <textarea
                  value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  placeholder="Reply..."
                  rows={2}
                  style={{ flex: 1, border: '1px solid #e0e0e5', borderRadius: 10, padding: '0.5rem 0.75rem', fontSize: 14, fontFamily: 'inherit', resize: 'none', outline: 'none' }}
                />
                <button onClick={sendMessage} disabled={sending || !input.trim()}
                  style={{ padding: '0 1rem', background: sending || !input.trim() ? '#d2d2d7' : '#0071e3', color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: sending ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade nudge after 2+ conversations */}
        {conversations.length >= 2 && view === 'list' && (
          <div style={{ marginTop: '2rem', background: 'linear-gradient(135deg, #f8f8ff, #f0f0ff)', border: '1px solid #e0e0ee', borderRadius: 14, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.2rem' }}>Looking for more builders?</p>
              <p style={{ fontSize: 13, color: '#6e6e73' }}>Browse 500+ verified AI-native builders and message anyone directly.</p>
            </div>
            <Link href="/employers"
              style={{ fontSize: 13, padding: '0.5rem 1.25rem', background: '#6c63ff', color: 'white', borderRadius: 980, textDecoration: 'none', fontWeight: 500, whiteSpace: 'nowrap' }}>
              Get full access — $199/mo
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
