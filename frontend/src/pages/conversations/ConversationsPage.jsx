import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../hooks/useApp.jsx';
import { Avatar, Empty } from '../../components/Ui.jsx';

export default function ConversationsPage() {
  const { data, mutate } = useApp();
  const [selected, setSelected] = useState('tanvir');
  const [text, setText] = useState('');
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [pendingReply, setPendingReply] = useState(null);
  const messagesEndRef = useRef(null);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [selected, data?.messages.length, pendingReply]);
  if (!data) return <Empty>Loading conversations…</Empty>;
  const contacts = data.contacts.filter((contact) => (filter === 'All' || (filter === 'AI' && contact.aiEnabled) || (filter === 'Manual' && contact.mode === 'Manual')) && contact.name.toLowerCase().includes(search.toLowerCase()));
  const contact = data.contacts.find((item) => item.id === selected) || contacts[0];
  if (!contact) return <Empty>No matching conversations.</Empty>;
  const messages = data.messages.filter((message) => message.contactId === contact.id);
  const send = async () => {
    const content = text.trim();
    if (!content || pendingReply) return;
    setText('');
    setPendingReply({ contactId: contact.id, content });
    try { await mutate('/messages/send', { method: 'POST', body: JSON.stringify({ contactId: contact.id, content }) }); }
    catch { /* AppProvider exposes the sanitized request error to the UI. */ }
    finally { setPendingReply(null); }
  };

  return <div className="conversation-grid">
    <section className="panel contacts">
      <h2>Conversations</h2>
      <input className="field" placeholder="Search conversations" value={search} onChange={(event) => setSearch(event.target.value)} />
      <div className="pills">{['All', 'AI', 'Manual'].map((item) => <button key={item} className={filter === item ? 'selected-pill' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div>
      {contacts.map((item) => <button className={contact.id === item.id ? 'selected' : ''} onClick={() => setSelected(item.id)} key={item.id}><Avatar name={item.name} /><span><strong>{item.name}</strong><small>{item.relationship}</small></span><i>{item.aiEnabled ? '●' : ''}</i></button>)}
    </section>
    <section className="panel chat">
      <div className="chat-head"><Avatar name={contact.name} /><strong>{contact.name}<small>{contact.mode}</small></strong></div>
      <div className="messages">
        {messages.map((message) => <div className={`message ${message.senderType === 'owner' ? 'out' : 'in'}`} key={message.id}>{message.type === 'image' && <b>▧ Photo<br /></b>}{message.content}<small>{message.senderType} · {message.deliveryStatus}</small>{message.deliveryStatus === 'failed' && <button onClick={() => mutate(`/messages/${message.id}/retry`, { method: 'POST' })}>Retry</button>}</div>)}
        {pendingReply?.contactId === contact.id && <div className="message out pending-message">{pendingReply.content}<small>you · sending</small></div>}
        {data.approvals.filter((approval) => approval.contactId === contact.id && approval.status === 'pending').map((approval) => <div className="approval" key={approval.id}><b>Approval needed</b><p>{approval.draft || approval.caption}</p><button onClick={() => mutate(`/approvals/${approval.id}/approve`, { method: 'POST' })}>Approve</button><button onClick={() => mutate(`/approvals/${approval.id}/reject`, { method: 'POST' })}>Reject</button></div>)}
        <div ref={messagesEndRef} />
      </div>
      <div className="composer"><input value={text} disabled={Boolean(pendingReply)} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && send()} placeholder={pendingReply ? 'Sending…' : 'Type a message…'} /><button disabled={Boolean(pendingReply)} aria-label="Send message" onClick={send}>➤</button></div>
    </section>
    <aside className="panel info">
      <h3>Contact Info</h3><Avatar name={contact.name} /><h3>{contact.name}</h3><span className="tag">{contact.relationship}</span><h4>Conversation Mode</h4><b>{contact.mode}</b><h4>Quick Actions</h4>
      <button onClick={() => mutate(`/conversations/${contact.id}/takeover`, { method: 'POST', body: JSON.stringify({ active: !contact.humanTakeover }) })}>{contact.humanTakeover ? 'Resume AI' : 'Take Over'}</button>
      <button onClick={() => location.assign('/friends-rules')}>View Rules</button><button onClick={() => location.assign('/activity')}>View Activity</button>
    </aside>
  </div>;
}
