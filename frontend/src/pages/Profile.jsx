import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import { useLanguage } from '../lib/i18n.jsx';

export default function Profile() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    apiRequest('/api/profile')
      .then(({ profile: data }) => {
        if (!active) return;
        setProfile(data);
        setName(data.name);
      })
      .catch((error) => {
        if (active) setMessage(error.message);
      });

    return () => {
      active = false;
    };
  }, []);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const { profile: updated } = await apiRequest('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      });

      setProfile((current) => ({ ...current, ...updated }));
      setName(updated.name);
      setMessage(t('profileUpdated'));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <section className="mx-auto max-w-3xl space-y-4 p-6 sm:p-8">
        <h1 className="text-3xl font-semibold">{t('profile')}</h1>

        <p
          role={message ? 'alert' : 'status'}
          className={`text-sm ${
            message ? 'text-destructive' : 'text-muted-foreground'
          }`}
        >
          {message || t('loading')}
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6 p-6 sm:p-8">
      <div>
        <p className="text-sm font-medium text-primary">{t('account')}</p>
        <h1 className="mt-2 text-3xl font-semibold">{t('profile')}</h1>
        <p className="mt-2 text-muted-foreground">
          {t('manageAccountDescription')}
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
            {(profile.name || profile.email || '?').slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-semibold">{profile.name}</h2>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <span className="mt-2 inline-block rounded-full bg-muted px-3 py-1 text-xs capitalize">
              {profile.role}
            </span>
          </div>
        </div>

        <form onSubmit={save} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium">{t('name')}</span>
            <input
              className="w-full rounded-md border bg-background px-3 py-2"
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              maxLength={80}
              required
            />
          </label>

          <div>
            <p className="text-sm font-medium">{t('email')}</p>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          </div>

          <div>
            <p className="text-sm font-medium">{t('memberSince')}</p>
            <p className="text-sm text-muted-foreground">
              {new Date(profile.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium">{t('repositories')}</p>
            <p className="text-sm text-muted-foreground">
              {profile.repositoryCount}
            </p>
          </div>

          {message && <p role="status" className="text-sm">{message}</p>}

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
          >
            {saving ? t('loading') : t('save')}
          </button>
        </form>
      </div>
    </section>
  );
}
