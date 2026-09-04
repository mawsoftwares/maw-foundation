import { registerLocale, hasKey } from '@mawsoftwares/sdk/i18n';

/** Default English strings for ui-auth screens. Apps may override via registerLocale. */
export const AUTH_EN_MESSAGES: Readonly<Record<string, string>> = {
  'common.na': 'N/A',
  'common.status': 'Status',
  'common.active': 'Active',
  'common.enabled': 'Enabled',
  'common.disabled': 'Disabled',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.loading': 'Loading...',
  'common.edit': 'Edit',

  'auth.profileDetails': 'Profile Details',
  'auth.editProfile': 'Edit Profile',
  'auth.firstName': 'First Name',
  'auth.lastName': 'Last Name',
  'auth.email': 'Email',
  'auth.phone': 'Phone',
  'auth.phoneNumber': 'Phone Number',
  'auth.memberSince': 'Member Since',
  'auth.role': 'Role',
  'auth.profileImage': 'Profile image',
  'auth.loadingProfile': 'Loading profile details...',
  'auth.profileNotFound': 'Profile not found',
  'auth.noProfileData': 'No profile data returned',
  'auth.profileLoadFailed': 'Failed to load profile',
  'auth.profileUpdated': 'Profile updated successfully',
  'auth.profileUpdateFailed': 'Update failed',

  'auth.changePassword': 'Change Password',
  'auth.currentPassword': 'Current Password',
  'auth.newPassword': 'New Password',
  'auth.confirmNewPassword': 'Confirm New Password',
  'auth.passwordChanged': 'Password changed successfully',
  'auth.passwordUpdated': 'Password updated successfully.',
  'auth.changeFailed': 'Change failed',

  'auth.twoFactorAuth': 'Two-Factor Authentication',
  'auth.mfaDescription': 'Add an extra layer of security by enabling TOTP-based two-factor authentication.',
  'auth.enable2fa': 'Enable 2FA',
  'auth.disable2fa': 'Disable 2FA',
  'auth.mfaAddSecret': 'Add this secret to your authenticator app, then enter the code to verify.',
  'auth.authenticatorCode': 'Authenticator Code',
  'auth.verifyAndActivate': 'Verify & Activate',
  'auth.backupCodesInfo': 'Save these backup codes in a safe place. Each can be used once if you lose your authenticator.',
  'auth.mfaDisableHint': 'Enter a code from your authenticator app to disable 2FA.',
  'auth.mfaScanSecret': 'Scan the secret with your authenticator app',
  'auth.mfaEnrollFailed': 'Enrollment failed',
  'auth.mfaEnabled': 'MFA enabled successfully',
  'auth.mfaVerifyFailed': 'Verification failed',
  'auth.mfaDisabled': 'MFA disabled',
  'auth.mfaDisableFailed': 'Disable failed',

  'auth.activeSessions': 'Active Sessions',
  'auth.revokeAllOthers': 'Revoke All Others',
  'auth.loadingSessions': 'Loading sessions...',
  'auth.noSessions': 'No active sessions found.',
  'auth.sessionsLoadFailed': 'Failed to load sessions. The sessions endpoint may not be available.',
  'auth.sessionRevoked': 'Session revoked',
  'auth.sessionRevokeFailed': 'Failed to revoke session',
  'auth.allSessionsRevoked': 'All other sessions revoked',
  'auth.sessionsRevokeFailed': 'Failed to revoke sessions',
  'auth.unknownDevice': 'Unknown Device',
  'auth.unknownIp': 'Unknown IP',
  'auth.lastActive': 'Last active',
  'auth.revoke': 'Revoke',

  'auth.login': 'Sign in',
  'auth.logout': 'Log out',
  'auth.password': 'Password',
  'auth.passwordHint': 'At least 8 characters, with an uppercase letter and a number',
  'auth.confirmPassword': 'Confirm password',
  'auth.fullName': 'Full name',
  'auth.invalidCredentials': 'Invalid email or password',
  'auth.loggedIn': 'Logged in',
  'auth.createAccount': 'Create account',
  'auth.alreadyHaveAccount': 'Already have an account? Sign in',
  'auth.forgotPassword': 'Forgot password?',
  'auth.forgotPasswordHint': 'Enter your email and we will send you a reset link.',
  'auth.haveVerificationToken': 'I have a verification code',
  'auth.haveResetToken': 'I have a reset token',
  'auth.verifyEmail': 'Verify your email',
  'auth.verifyEmailHint': 'Paste the code from your email, or open the confirmation link we sent you.',
  'auth.verificationToken': 'Verification code',
  'auth.verificationSent': 'A verification link has been sent to your email address. Please check your inbox to activate your account.',
  'auth.accountCreated': 'Account created! Check your email to verify.',
  'auth.registrationFailed': 'Registration failed',
  'auth.passwordsMismatch': 'Passwords do not match',
  'auth.backToLogin': 'Back to login',
  'auth.sendResetLink': 'Send reset link',
  'auth.resetEmailSent': 'If an account exists, a reset email has been sent.',
  'auth.checkEmail': 'Check your email',
  'auth.resetEmailInfo': 'If an account with that email exists, we have sent a password reset link. Check your inbox.',
  'auth.resetPassword': 'Reset password',
  'auth.resetToken': 'Reset token',
  'auth.resetTokenPlaceholder': 'Paste the token from your email',
  'auth.passwordResetSuccess': 'Password has been reset successfully!',
  'auth.passwordReset': 'Password reset',
  'auth.passwordResetDone': 'Your password has been successfully reset. You can now sign in with your new password.',
  'auth.resetFailed': 'Reset failed',
  'auth.emailVerified': 'Email verified. You can sign in now.',
  'auth.emailVerifiedTitle': 'Email verified',
  'auth.emailVerifiedDone': 'Your email is confirmed. You can sign in with your password.',
  'auth.verificationFailed': 'Verification failed',
};

registerLocale('en', AUTH_EN_MESSAGES);

/**
 * Translate with English fallback when the key is missing from the active catalog.
 * Avoids showing raw keys like `auth.twoFactorAuth`.
 */
export function tr(
  t: (key: string, params?: Readonly<Record<string, string | number>>) => string,
  key: string,
  params?: Readonly<Record<string, string | number>>,
): string {
  if (hasKey(key) || hasKey(key, 'en')) {
    return t(key, params);
  }
  const fallback = AUTH_EN_MESSAGES[key];
  if (fallback !== undefined) {
    if (params === undefined) return fallback;
    return fallback.replace(/\{(\w+)\}/g, (_, name: string) =>
      name in params ? String(params[name]) : `{${name}}`,
    );
  }
  const value = t(key, params);
  return value === key ? key.split('.').pop() ?? key : value;
}
