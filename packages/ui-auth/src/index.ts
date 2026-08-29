import './i18n';

export { AuthScreen } from './components/AuthScreen';
export { LoginForm, type LoginFormProps } from './components/LoginForm';
export { RegisterForm, type RegisterFormProps } from './components/RegisterForm';
export { VerifyEmailForm, type VerifyEmailFormProps } from './components/VerifyEmailForm';
export { ForgotPasswordForm, type ForgotPasswordFormProps } from './components/ForgotPasswordForm';
export { ResetPasswordForm, type ResetPasswordFormProps } from './components/ResetPasswordForm';
export { ChangePasswordForm, type ChangePasswordFormProps } from './components/ChangePasswordForm';
export { MfaSetup, type MfaSetupProps } from './components/MfaSetup';
export { SessionsManager, type SessionsManagerProps, type SessionInfo } from './components/SessionsManager';
export { UserProfileForm, type UserProfileFormProps, type UserProfileData } from './components/UserProfileForm';
export { AUTH_EN_MESSAGES, tr } from './i18n';
export { useAuthT } from './useAuthT';
