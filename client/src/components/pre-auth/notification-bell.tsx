import { useState } from "react";
import { Bell, CheckCheck, Trash2, Circle, FileText, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type PreAuthNotificationType = 
  | "claim_created" 
  | "claim_status_change" 
  | "signal_generated" 
  | "decision_ready" 
  | "action_required"
  | "system";

interface PreAuthNotification {
  id: string;
  type: PreAuthNotificationType;
  message: string;
  timestamp: Date;
  read: boolean;
  claimId?: string;
  metadata?: Record<string, unknown>;
}

interface PreAuthNotificationBellProps {
  notifications: PreAuthNotification[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onClear?: () => void;
  onNotificationClick?: (notification: PreAuthNotification) => void;
  isConnected?: boolean;
  className?: string;
}

function getNotificationIcon(type: PreAuthNotificationType) {
  switch (type) {
    case "claim_created":
      return <FileText className="h-4 w-4 text-blue-500" />;
    case "claim_status_change":
      return <AlertCircle className="h-4 w-4 text-amber-500" />;
    case "signal_generated":
      return <Clock className="h-4 w-4 text-purple-500" />;
    case "decision_ready":
      return <AlertCircle className="h-4 w-4 text-green-500" />;
    case "action_required":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onClick,
}: {
  notification: PreAuthNotification;
  onMarkAsRead?: (id: string) => void;
  onClick?: () => void;
}) {
  const handleClick = () => {
    onMarkAsRead?.(notification.id);
    onClick?.();
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 hover-elevate cursor-pointer rounded-md",
        !notification.read && "bg-accent/50"
      )}
      onClick={handleClick}
      data-testid={`preauth-notification-item-${notification.id}`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {getNotificationIcon(notification.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug">{notification.message}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
        </p>
      </div>
      {!notification.read && (
        <Circle className="h-2 w-2 fill-primary text-primary flex-shrink-0 mt-2" />
      )}
    </div>
  );
}

export function PreAuthNotificationBell({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClear,
  onNotificationClick,
  isConnected = true,
  className,
}: PreAuthNotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = (notification: PreAuthNotification) => {
    onNotificationClick?.(notification);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", className)}
          data-testid="button-preauth-notification-bell"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
              data-testid="notification-badge-count"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
          {!isConnected && (
            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-destructive" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0"
        data-testid="popover-preauth-notifications"
      >
        <div className="flex items-center justify-between gap-2 p-3 border-b">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">Notifications</h4>
            {!isConnected && (
              <Badge variant="outline" className="text-xs">
                Offline
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onMarkAllAsRead}
                  title="Mark all as read"
                  data-testid="button-mark-all-read"
                >
                  <CheckCheck className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onClear}
                  title="Clear all"
                  data-testid="button-clear-notifications"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="p-1">
              {notifications.map((notification, index) => (
                <div key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onMarkAsRead={onMarkAsRead}
                    onClick={() => handleNotificationClick(notification)}
                  />
                  {index < notifications.length - 1 && (
                    <div className="mx-3 border-b border-muted" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && unreadCount > 0 && (
          <div className="p-2 border-t text-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs w-full"
              onClick={onMarkAllAsRead}
              data-testid="button-mark-all-read-footer"
            >
              Mark all {unreadCount} as read
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
