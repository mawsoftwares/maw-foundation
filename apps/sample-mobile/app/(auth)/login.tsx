import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View, type TextStyle } from 'react-native';
import { router } from 'expo-router';
import {
  useAuth,
  useNativeTheme,
  useForm,
  useToast,
  Button,
  TextField,
  Card,
  FormField,
} from '@mawsoftwares/ui-native';

export default function LoginScreen(): ReactNode {
  const { login } = useAuth();
  const { styles: t } = useNativeTheme();
  const toast = useToast();

  const form = useForm({
    initialValues: { email: '', password: '' },
    fields: {
      email: { required: true },
      password: { required: true },
    },
    onSubmit: async (values) => {
      try {
        await login({ email: values.email, password: values.password });
        router.replace('/(tabs)');
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.canvas }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{
          flex: 1,
          justifyContent: 'center',
          padding: t.spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center', marginBottom: t.spacing.xxl }}>
          <Text style={{ fontSize: 32, marginBottom: t.spacing.sm }}>⚡</Text>
          <Text style={{
            fontSize: t.typography.size.xl,
            fontWeight: t.typography.weight.bold as TextStyle['fontWeight'],
            color: t.colors.fg,
            fontFamily: t.typography.fontFamily,
          }}>
            MAW Foundation
          </Text>
          <Text style={{
            fontSize: t.typography.size.sm,
            color: t.colors.fgMuted,
            fontFamily: t.typography.fontFamily,
            marginTop: t.spacing.xs,
          }}>
            Sign in to continue
          </Text>
        </View>

        <Card>
          <FormField label="Email" error={form.getFieldProps('email').error} required>
            <TextField
              value={form.values.email as string}
              onChangeText={form.getFieldProps('email').onChangeText}
              onBlur={form.getFieldProps('email').onBlur}
              placeholder="admin@maw.dev"
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
          </FormField>

          <FormField label="Password" error={form.getFieldProps('password').error} required>
            <TextField
              value={form.values.password as string}
              onChangeText={form.getFieldProps('password').onChangeText}
              onBlur={form.getFieldProps('password').onBlur}
              placeholder="Password"
              secureTextEntry
              textContentType="password"
            />
          </FormField>

          <Button
            title={form.submitting ? 'Signing in...' : 'Sign In'}
            onPress={() => form.handleSubmit()}
            disabled={form.submitting}
            loading={form.submitting}
            style={{ marginTop: t.spacing.md }}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
