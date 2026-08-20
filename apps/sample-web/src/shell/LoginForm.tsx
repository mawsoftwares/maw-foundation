import { useState, type ReactNode } from 'react';
import { Button, Card, TextField, useAuth } from '@maw/ui-web';
import { palette, typography } from '@maw/theme';

export function LoginForm(): ReactNode {
  const { login } = useAuth();
  const [email, setEmail] = useState('owner@demo.test');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);

  return (
    <Card style={{ maxWidth: 420 }}>
      <h2 style={{ marginTop: 0, color: palette.fg }}>Sign in</h2>
      <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextField
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error !== null && <p style={{ color: palette.danger }}>{error}</p>}
      <Button
        onClick={() => {
          setError(null);
          login({ email, password }).catch(() => setError('Invalid credentials'));
        }}
      >
        Log in
      </Button>
      <p style={{ fontSize: typography.size.sm, color: palette.fgMuted, marginBottom: 0 }}>
        <strong>superadmin@</strong> = super admin (everything) &nbsp;|&nbsp;
        <strong>owner@</strong> = admin (everything) &nbsp;|&nbsp;
        <strong>manager@</strong> = reports + orders + audit-read &nbsp;|&nbsp;
        <strong>clerk@</strong> = orders + create billing
        <br />
        Password: <code>password123</code>
      </p>
    </Card>
  );
}
