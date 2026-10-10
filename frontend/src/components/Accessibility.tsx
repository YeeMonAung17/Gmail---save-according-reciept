import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

type Settings = { text: 'standard' | 'large' | 'extra'; contrast: boolean; motion: boolean };
const defaults: Settings = { text: 'standard', contrast: false, motion: false };

export function Accessibility() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [ready, setReady] = useState(false);
  const [warning, setWarning] = useState('');
  const panel = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('recurrsave_accessibility');
      if (stored) {
        const value = JSON.parse(stored) as Settings;
        if (!['standard', 'large', 'extra'].includes(value.text) || typeof value.contrast !== 'boolean' || typeof value.motion !== 'boolean') throw new Error('Invalid display settings.');
        setSettings(value);
      }
    } catch (error) {
      console.warn('Display preferences could not be restored.', error instanceof Error ? error.name : 'StorageError');
      setWarning('Saved display preferences could not be restored. You can still change them here.');
    }
    setReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.text = settings.text;
    document.documentElement.dataset.contrast = settings.contrast ? 'high' : 'normal';
    document.documentElement.dataset.motion = settings.motion ? 'reduced' : 'system';
    if (!ready) return;
    try { localStorage.setItem('recurrsave_accessibility', JSON.stringify(settings)); }
    catch (error) {
      console.warn('Display preferences could not be saved.', error instanceof Error ? error.name : 'StorageError');
      setWarning('These preferences apply now, but this browser could not save them.');
    }
  }, [settings, ready]);

  return <details className="accessibility" ref={panel} onKeyDown={(event) => {
    if (event.key === 'Escape' && panel.current) { panel.current.open = false; panel.current.querySelector('summary')?.focus(); }
  }}>
    <summary><Icon name="access" size={18} /> Accessibility</summary>
    <div className="accessibility-panel">
      <p className="panel-title">Make yourself comfortable</p>
      <label htmlFor="text-size">Text size</label>
      <select id="text-size" value={settings.text} onChange={(event) => setSettings({ ...settings, text: event.target.value as Settings['text'] })}>
        <option value="standard">Standard</option><option value="large">Large</option><option value="extra">Extra large</option>
      </select>
      <label className="check-label"><input type="checkbox" checked={settings.contrast} onChange={(event) => setSettings({ ...settings, contrast: event.target.checked })} /> High contrast</label>
      <label className="check-label"><input type="checkbox" checked={settings.motion} onChange={(event) => setSettings({ ...settings, motion: event.target.checked })} /> Reduce motion</label>
      <p className="hint">Your system motion preferences are always respected. Press Escape to close.</p>
      <button className="button secondary" onClick={() => setSettings(defaults)}>Restore defaults</button>
      {warning && <p role="status" className="hint">{warning}</p>}
    </div>
  </details>;
}
