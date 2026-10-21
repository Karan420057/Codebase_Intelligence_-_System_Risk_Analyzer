import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { apiRequest } from '../lib/api';
import { useLanguage } from '../lib/i18n.jsx';

export default function Settings({ role = 'user' }) {
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    let active = true;

    apiRequest('/api/settings')
      .then(({ settings }) => {
        if (!active) return;
        setLanguage(settings.language);
        setTheme(settings.theme);
      })
      .catch((error) => {
        if (active) setMessage(error.message);
      });

    if (role === 'admin') {
      apiRequest('/api/settings/admin/overview')
        .then((data) => {
          if (active) setOverview(data);
        })
        .catch((error) => {
          if (active) setMessage(error.message);
        });
    }

    return () => {
      active = false;
    };
  }, [role, setLanguage, setTheme]);

  async function savePreferences(next) {
    setSaving(true);
    setMessage('');

    try {
      const { settings } = await apiRequest('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(next),
      });

      if (settings.language) setLanguage(settings.language);
      if (settings.theme) setTheme(settings.theme);
      setMessage('Settings saved.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6 p-6 sm:p-8">
      <div>
        <p className="text-sm font-medium text-primary">{t('account')}</p>
        <h1 className="mt-2 text-3xl font-semibold">{t('settings')}</h1>
        <p className="mt-2 text-muted-foreground">
          Configure your Codebase Intelligence experience.
        </p>
      </div>

      <div className="space-y-5 rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold">{t('appearance')}</h2>

        <label className="flex items-center justify-between gap-4">
          <span>{t('appearance')}</span>
          <select
            className="rounded-md border bg-background px-3 py-2"
            value={theme || 'system'}
            onChange={(event) => {
              const value = event.target.value;
              setTheme(value);
              void savePreferences({ theme: value });
            }}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>

        <label className="flex items-center justify-between gap-4">
          <span>{t('language')}</span>
          <select
            className="rounded-md border bg-background px-3 py-2"
            value={language}
            onChange={(event) => {
              const value = event.target.value;
              setLanguage(value);
              void savePreferences({ language: value });
            }}
          >
            <option value="en">{t('english')}</option>
            <option value="hi">{t('hindi')}</option>
          </select>
        </label>

        {saving && <p className="text-sm text-muted-foreground">{t('loading')}</p>}
        {message && <p role="status" className="text-sm">{message}</p>}
      </div>

      {role === 'admin' && (
        <div className="space-y-4 rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold">{t('adminSettings')}</h2>
          <p className="text-sm text-muted-foreground">
            Administrative account statistics.
          </p>
          {overview && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">{t('regularUsers')}</p>
                <p className="text-2xl font-semibold">{overview.users}</p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">{t('administrators')}</p>
                <p className="text-2xl font-semibold">{overview.admins}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
