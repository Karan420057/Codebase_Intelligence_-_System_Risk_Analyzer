import { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useLanguage } from '../../lib/i18n.jsx';

export default function NotificationPanel({ onClose }) {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async () => {
    try {
      const { notifications: items } = await apiRequest('/api/notifications');
      setNotifications(items);

      await apiRequest('/api/notifications/read-all', {
        method: 'POST',
      });

      setNotifications(items.map((item) => ({ ...item, read: true })));
      window.dispatchEvent(new Event('codesentinel-notifications-updated'));
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  async function markAllRead() {
    try {
      await apiRequest('/api/notifications/read-all', {
        method: 'POST',
      });

      setNotifications((current) =>
        current.map((item) => ({ ...item, read: true })),
      );
      window.dispatchEvent(new Event('codesentinel-notifications-updated'));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function markOneRead(item) {
    if (item.read) return;

    try {
      await apiRequest(
        `/api/notifications/${encodeURIComponent(item.id)}/read`,
        { method: 'POST' },
      );

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === item.id
            ? { ...notification, read: true }
            : notification,
        ),
      );

      window.dispatchEvent(new Event('codesentinel-notifications-updated'));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section
      aria-label={t('notifications')}
      className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl"
    >
      <header className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2 font-semibold">
          <Bell className="size-4" />
          {t('notifications')}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={markAllRead}
            title={t('markRead')}
            aria-label={t('markRead')}
            className="rounded-md p-2 hover:bg-accent"
          >
            <CheckCheck className="size-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="rounded-md p-2 hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      <div className="max-h-[min(65vh,28rem)] overflow-y-auto">
        {loading && (
          <p className="p-5 text-sm text-muted-foreground">{t('loading')}</p>
        )}

        {error && (
          <p role="alert" className="p-4 text-sm text-destructive">{error}</p>
        )}

        {!loading && !error && notifications.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            {t('noNotifications')}
          </p>
        )}

        {!loading && notifications.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => markOneRead(item)}
            className={`block w-full border-b p-4 text-left transition-colors hover:bg-accent ${
              item.read ? '' : 'bg-primary/5'
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-1 size-2 shrink-0 rounded-full ${
                  item.read ? 'bg-muted' : 'bg-primary'
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{item.title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {item.message}
                </span>
                {item.actor && (
                  <span className="mt-2 block break-all text-xs text-muted-foreground">
                    {item.actor.name} · {item.actor.email}
                  </span>
                )}
                <span className="mt-2 block text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
