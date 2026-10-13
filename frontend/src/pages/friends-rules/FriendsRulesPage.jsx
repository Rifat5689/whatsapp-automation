import { useState } from 'react';
import { useApp } from '../../hooks/useApp.jsx';
import { Avatar, Modal, Toggle, Empty } from '../../components/Ui.jsx';

const blank = { name: '', phone: '', relationship: 'Friend', language: 'Bangla', communicationStyle: 'Casual and friendly', replyGuidance: '', mode: 'AI Approval', aiEnabled: true, memoryPermissions: true, photoPermissions: false, notes: '' };

function ContactForm({ contact, onClose, save, remove, importChat }) {
  const [form, setForm] = useState({ ...blank, ...contact });
  const [ownerName, setOwnerName] = useState('');
  const [chatFile, setChatFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importNotice, setImportNotice] = useState('');
  const set = (key, value) => setForm({ ...form, [key]: value });
  const analyze = async () => {
    if (!chatFile || !ownerName.trim()) return;
    setImporting(true);
    try {
      const updated = await importChat(contact.id, chatFile, ownerName.trim());
      setForm({ ...form, ...updated });
      setImportNotice('Rules applied. Personalized AI mode is now active. Save any edits below before closing.');
    } finally { setImporting(false); }
  };

  return <Modal title={contact ? 'Edit Contact' : 'Add Contact'} onClose={onClose}>
    <form className="detail-form" onSubmit={(event) => { event.preventDefault(); save(form); }}>
      <label>Name<input required maxLength="80" value={form.name} onChange={(event) => set('name', event.target.value)} /></label>
      <label>Phone (optional)<input value={form.phone} onChange={(event) => set('phone', event.target.value)} /></label>
      {form.telegramUsername && <label>Telegram username<input value={`@${form.telegramUsername}`} disabled /></label>}
      <label>Relationship<select value={form.relationship} onChange={(event) => set('relationship', event.target.value)}>{['Close Friend', 'Friend', 'Family', 'Professional', 'Unknown'].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Language<select value={form.language} onChange={(event) => set('language', event.target.value)}>{['Bangla', 'English', 'Mixed'].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Conversation Mode<select value={form.mode} onChange={(event) => set('mode', event.target.value)}>{['AI Auto', 'AI Approval', 'Manual'].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Communication Style<input value={form.communicationStyle} onChange={(event) => set('communicationStyle', event.target.value)} /></label>
      <label className="wide">Friend-specific AI reply rules<textarea maxLength="1500" value={form.replyGuidance || ''} onChange={(event) => set('replyGuidance', event.target.value)} /></label>
      <label className="wide">Notes<textarea value={form.notes} onChange={(event) => set('notes', event.target.value)} /></label>
      <div><Toggle label="AI Enabled" checked={form.aiEnabled} onChange={(value) => set('aiEnabled', value)} /><Toggle label="Memory Enabled" checked={form.memoryPermissions} onChange={(value) => set('memoryPermissions', value)} /><Toggle label="Photo Sharing" checked={form.photoPermissions} onChange={(value) => set('photoPermissions', value)} /></div>
      {contact && <section className="wide chat-import">
        <h3>Learn from WhatsApp chat</h3>
        <p>Upload the exported `.txt` conversation and enter your exact name from the export. The configured AI analyzes your writing style for this friend. The raw chat is not stored.</p>
        <label>Your name in the export<input maxLength="80" value={ownerName} onChange={(event) => setOwnerName(event.target.value)} /></label>
        <label>WhatsApp chat export<input type="file" accept=".txt,text/plain" onChange={(event) => setChatFile(event.target.files?.[0] || null)} /></label>
        <button type="button" disabled={!chatFile || !ownerName.trim() || importing} onClick={analyze}>{importing ? 'Analyzing…' : 'Analyze and apply rules'}</button>
        {importNotice && <p>{importNotice}</p>}
        {!contact.telegramChatId && <p><b>Telegram note:</b> this contact is not linked to a Telegram chat. Import the file into the contact automatically created when that person messages your bot.</p>}
      </section>}
      <footer>{contact && <button type="button" className="danger-button" onClick={remove}>Delete</button>}<button type="button" onClick={onClose}>Cancel</button><button>Save</button></footer>
    </form>
  </Modal>;
}

export default function FriendsRulesPage() {
  const { data, mutate } = useApp();
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  if (!data) return <Empty>Loading contacts…</Empty>;
  const contacts = data.contacts.filter((contact) => (filter === 'All' || contact.relationship === filter) && contact.name.toLowerCase().includes(search.toLowerCase()));
  const close = () => { setEditing(null); setAdding(false); };
  const save = async (form) => { if (editing) await mutate(`/contacts/${editing.id}`, { method: 'PATCH', body: JSON.stringify(form) }); else await mutate('/contacts', { method: 'POST', body: JSON.stringify(form) }); close(); };
  const remove = async () => { if (confirm('Delete this contact and conversation history?')) { await mutate(`/contacts/${editing.id}`, { method: 'DELETE' }); close(); } };
  const importChat = async (contactId, file, ownerName) => { const body = new FormData(); body.append('chat', file); body.append('ownerName', ownerName); const updated = await mutate(`/contacts/${contactId}/import-chat`, { method: 'POST', body, timeout: 45000 }); setEditing(updated); return updated; };
  return <>
    <div className="title-row"><div><h1>Friends & Rules</h1><div className="pills">{['All', 'Close Friend', 'Friend', 'Family', 'Professional', 'Unknown'].map((item) => <button key={item} className={filter === item ? 'selected-pill' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div></div><button onClick={() => setAdding(true)}>＋ Add Contact</button></div>
    <input className="field search-wide" placeholder="Search contacts" value={search} onChange={(event) => setSearch(event.target.value)} />
    <div className="table"><div className="tr th"><span>Name</span><span>Relationship</span><span>Language</span><span>Mode</span><span>AI</span><span>Photo</span></div>{contacts.map((contact) => <button className="tr row-button" key={contact.id} onClick={() => setEditing(contact)}><span><Avatar name={contact.name} /><strong>{contact.name}</strong></span><span className="tag">{contact.relationship}</span><span>{contact.language}</span><span>{contact.mode}</span><span>{contact.aiEnabled ? 'On' : 'Off'}</span><span>{contact.photoPermissions ? 'Allowed' : 'None'}</span></button>)}</div>
    {(adding || editing) && <ContactForm contact={editing} onClose={close} save={save} remove={remove} importChat={importChat} />}
  </>;
}
