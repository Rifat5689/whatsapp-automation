import { useApp } from '../../hooks/useApp.jsx';
import { Empty, Toggle } from '../../components/Ui.jsx';

export default function SettingsPage() {
  const { data, mutate } = useApp();
  if (!data) return <Empty>Loading settings…</Empty>;
  const settings = data.settings;
  const change = (values) => mutate('/settings', { method: 'PATCH', body: JSON.stringify(values) });
  const messaging = data.integrations?.messagingProvider === 'telegram' ? 'Telegram connected' : 'Mock messaging connected';
  return <>
    <h1>Settings</h1>
    <div className="tabs"><button className="active">General</button><button>Privacy & Safety</button><button>Integrations</button><button>Account</button></div>
    <div className="settings-grid">
      <section>
        <h3>AI Controls</h3>
        <Toggle label="Global AI Enabled" checked={settings.aiEnabled} onChange={(value) => change({ aiEnabled: value })} />
        <div className="emergency"><Toggle label="Emergency Stop" checked={settings.emergencyStop} onChange={(value) => change({ emergencyStop: value })} /><small>Immediately stops automatic outbound actions.</small></div>
        <label>Default Conversation Mode<select value={settings.defaultMode} onChange={(event) => change({ defaultMode: event.target.value })}><option>AI Auto</option><option>AI Approval</option><option>Manual</option></select></label>
        <label>Unknown Contact Behavior<select value={settings.unknownBehavior} onChange={(event) => change({ unknownBehavior: event.target.value })}><option>Manual</option><option>AI Approval</option></select></label>
      </section>
      <section>
        <h3>Notifications</h3>
        <Toggle label="New Messages" checked={settings.notifications} onChange={(value) => change({ notifications: value })} />
        <Toggle label="Approval Requests" checked={settings.notifications} onChange={(value) => change({ notifications: value })} />
        <Toggle label="Delivery Failures" checked={settings.notifications} onChange={(value) => change({ notifications: value })} />
        <h3>Integration Status</h3><p><span className="status-dot" /> {messaging}</p>
      </section>
    </div>
  </>;
}
