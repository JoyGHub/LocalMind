import { AlertOptions } from '../types/interfaces';

class AlertService {
  static instance: AlertService;

  constructor() {
    this.injectToastStyles();
  }

  injectToastStyles() {
    if (document.getElementById('sl-toast-z-index-fix')) return;

    const style = document.createElement('style');
    style.id = 'sl-toast-z-index-fix';
    style.innerHTML = `
      .sl-toast-stack {
        z-index: 2147483647 !important;
      }
    `;
    document.head.appendChild(style);
  }

  public static getInstance(): AlertService {
    if (!AlertService.instance) {
      AlertService.instance = new AlertService();
    }
    return AlertService.instance;
  }

  escapeHtml(html: string) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }

  public notify({ message, variant = 'primary', icon = 'info-circle', duration = 5000, closable = true }: AlertOptions) {
    const alert = Object.assign(document.createElement('sl-alert'), {
      variant,
      closable,
      duration,
      innerHTML: `
        <sl-icon name="${icon}" slot="icon"></sl-icon>
        ${this.escapeHtml(message)}
      `,
    });

    document.body.append(alert);
    return (alert as any).toast();
  }

  public success(message: string) {
    this.notify({ message, variant: 'success', icon: 'check2-circle' });
  }

  public error(message: string) {
    this.notify({ message, variant: 'danger', icon: 'exclamation-octagon' });
  }
}

export const Alert = AlertService.getInstance();
