import { useState } from 'react';
import { useApp } from '../../hooks/useApp.jsx';
import { Empty, Toggle } from '../../components/Ui.jsx';

export default function AIModelsPage() {
  const { data, mutate } = useApp();
  const [form, setForm] = useState(data?.ai);
  if (!data || !form) return <Empty>Loading AI models…</Empty>;
  const set = (tier, key, value) => setForm({ ...form, [tier]: { ...form[tier], [key]: value } });
  return <>
    <div className="title-row"><h1>AI Models</h1><button onClick={() => mutate('/ai', { method: 'PATCH', body: JSON.stringify(form) })}>Save Changes</button></div>
    <div className="model-card">
      <label>Instruction mode<select value={form.instructionMode || 'Personalized'} onChange={(event) => setForm({ ...form, instructionMode: event.target.value })}><option>Personalized</option><option>Raw</option></select></label>
      {['primary', 'fallback'].map((tier) => <section key={tier}>
        <h3>{tier === 'primary' ? 'Primary Model' : 'Fallback Model'} {tier === 'primary' && <span className="success">Active</span>}</h3>
        <div>
          <label>Provider<select value={form[tier].provider} onChange={(event) => set(tier, 'provider', event.target.value)}><option>Mock</option><option>OpenRouter</option><option>Gemini</option></select></label>
          <label>Models<input value={form[tier].model} onChange={(event) => set(tier, 'model', event.target.value)} placeholder={form[tier].provider === 'OpenRouter' ? 'openrouter/free' : 'model-one, model-two'} /></label>
        </div>
        <Toggle label="Enabled" checked={form[tier].enabled} onChange={(value) => set(tier, 'enabled', value)} />
      </section>)}
      <p>Personalized mode uses the editable Personalization and Friends & Rules values. Raw mode sends only the latest message. Enter model IDs separated by commas in fallback order.</p>
    </div>
  </>;
}
