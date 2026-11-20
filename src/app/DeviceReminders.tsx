import { useEffect, useState } from 'react';
import { getState, markReminderNotified, updateSettings, useStore } from '../store/store';

export function DeviceReminderSettings() {
  const { settings } = useStore();
  const supported = typeof Notification !== 'undefined' && 'serviceWorker' in navigator;
  const [message, setMessage] = useState('');
  const toggle = async (enabled: boolean) => {
    if (!enabled) { updateSettings({ deviceReminders: false }); return; }
    try {
      const permission = await Notification.requestPermission();
      updateSettings({ deviceReminders: permission === 'granted' });
      setMessage(permission === 'granted' ? 'Device reminders enabled.' : 'Permission was not granted. Reminders still appear in Today.');
    } catch { setMessage('Notifications are unavailable here. Reminders still appear in Today.'); }
  };
  return <section className="set-sec"><h2>Device reminders</h2><label className="check"><input type="checkbox" disabled={!supported} checked={!!settings.deviceReminders && supported && Notification.permission === 'granted'} onChange={(e) => void toggle(e.target.checked)} /><span><b>Remind me on this device</b><small>Shows notifications for due reminders while this app or its installed web app is running. Delivery may be delayed while the device sleeps. No background push: nothing is sent when the app is closed.</small></span></label>{!supported && <p className="hint">This browser does not support device notifications here. Reminders still appear in Today.</p>}<p role="status" className="hint">{message}</p></section>;
}

export function DeviceReminders() {
  useEffect(() => {
    let busy = false;
    const check = async () => {
      if (busy || !getState().settings.deviceReminders || typeof Notification === 'undefined' || Notification.permission !== 'granted' || !('serviceWorker' in navigator)) return;
      busy = true;
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration?.active) return;
        for (const m of getState().memories) {
          if (!m.reminderAt || Date.parse(m.reminderAt) > Date.now() || !Number.isFinite(Date.parse(m.reminderAt)) || m.reminderNotifiedAt === m.reminderAt) continue;
          await registration.showNotification('A saved thought is ready', { body: 'Open Today to see your reminder.', tag: `reminder-${m.id}`, icon: '/icons/icon-192.png', data: { url: '/app/today' } });
          markReminderNotified(m.id, m.reminderAt);
        }
      } catch { /* Notifications are optional. Today remains available. */ }
      finally { busy = false; }
    };
    void check();
    const timer = window.setInterval(() => void check(), 30_000);
    const focus = () => void check();
    window.addEventListener('focus', focus);
    return () => { clearInterval(timer); window.removeEventListener('focus', focus); };
  }, []);
  return null;
}
