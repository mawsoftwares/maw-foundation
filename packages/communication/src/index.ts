export { NotificationService, type NotificationServiceOptions } from './notification-service';
export { NotificationProviderRegistry } from './provider-registry';
export { MustacheTemplateRenderer, validateTemplateVariables } from './template-renderer';
export { InMemoryInAppNotificationStore } from './in-app-store';
export { InMemoryTemplateStore } from './template-store';
export { ConsoleNotificationProvider } from './providers/console-provider';
export { createCommunication, type CommunicationConfig, type CommunicationModule } from './factory';
export { EmailService, type EmailServiceOptions, type SendEmailOptions } from './EmailService';
export { SmsService, type SmsServiceOptions, type SendSmsOptions } from './SmsService';
export {
  InAppNotificationService,
  type InAppNotificationServiceOptions,
  type SendInAppOptions,
} from './InAppNotificationService';
export { SmtpNotificationProvider, type SmtpProviderOptions } from './providers/smtp-provider';
export { PgInAppNotificationStore } from './pg-notification-store';
export { PgTemplateStore } from './pg-template-store';
