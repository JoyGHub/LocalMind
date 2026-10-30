export class NotificationService {
  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications.');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  static notify(title: string, body: string, iconUrl?: string) {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: body,
        icon: iconUrl,
        silent: false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }
}
