import { useEffect, useState } from 'react';
import { Bell, CheckCheck, AlertTriangle, Briefcase, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const [data, setData] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications', { params: { unread: unreadOnly } });
      setData(res.data.data);
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [unreadOnly]);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      toast.success('Notification marked as read');
      fetchNotifications();
    } catch {
      toast.error('Failed to mark notification');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      toast.success('All notifications marked as read');
      fetchNotifications();
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const getIcon = (type: string) => {
    if (type === 'LOW_STOCK') return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    if (type === 'PENDING_SERVICE') return <Briefcase className="h-5 w-5 text-blue-500" />;
    return <Calendar className="h-5 w-5 text-emerald-500" />;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications & Alerts"
        description="System alerts for low inventory stock, pending services, and customer reminders"
        action={
          <Button variant="default" onClick={markAllAsRead}>
            <CheckCheck className="mr-2 h-4 w-4" /> Mark All as Read
          </Button>
        }
      />

      <div className="flex gap-2">
        <Button
          variant={!unreadOnly ? 'default' : 'default'}
          size="sm"
          onClick={() => setUnreadOnly(false)}
        >
          All Alerts
        </Button>
        <Button
          variant={unreadOnly ? 'default' : 'default'}
          size="sm"
          onClick={() => setUnreadOnly(true)}
        >
          Unread Only
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading notifications...</div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="mx-auto h-12 w-12 stroke-1 text-muted-foreground/40 mb-2" />
            <p>No notifications found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((item) => (
            <Card
              key={item.id}
              className={`transition-colors ${!item.isRead ? 'border-l-4 border-l-primary bg-primary/5' : ''}`}
            >
              <CardContent className="p-4 flex items-start gap-4 justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getIcon(item.type)}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm">{item.title}</h4>
                      <Badge variant={item.isRead ? 'default' : 'default'} className="text-[10px]">
                        {item.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{item.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                </div>

                {!item.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => markAsRead(item.id)}
                  >
                    Mark Read
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
