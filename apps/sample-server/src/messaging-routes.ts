import { Router, type RequestHandler } from 'express';
import type { DrizzleDb } from '@mawsoftwares/database';
import { schema } from '@mawsoftwares/database';
import { eq, and, desc } from 'drizzle-orm';
import type { AuthedRequest } from '@mawsoftwares/server-express';
import {
  MustacheTemplateRenderer,
  SmtpNotificationProvider,
  HttpSmsProvider,
  HttpWhatsAppProvider,
  type EmailService,
} from '@mawsoftwares/communication';
import { NotificationChannel } from '@mawsoftwares/sdk';

type Channel = 'email' | 'sms' | 'whatsapp';

const SENSITIVE_FIELDS: Record<Channel, string[]> = {
  email: ['pass'],
  sms: ['apiKey'],
  whatsapp: ['apiKey'],
};
const MASK = '********';

export interface MessagingEncryptionService {
  encrypt(plaintext: string): Promise<string>;
  decrypt(ciphertext: string): Promise<string>;
}

const renderer = new MustacheTemplateRenderer();

function maskConfig(channel: Channel, config: Record<string, unknown>): Record<string, unknown> {
  const masked = { ...config };
  for (const f of SENSITIVE_FIELDS[channel]) {
    if (masked[f]) masked[f] = MASK;
  }
  return masked;
}

async function encryptSensitiveFields(
  channel: Channel,
  incoming: Record<string, unknown>,
  existing: Record<string, unknown> | undefined,
  encryption: MessagingEncryptionService,
): Promise<Record<string, unknown>> {
  const out = { ...incoming };
  for (const f of SENSITIVE_FIELDS[channel]) {
    const v = out[f];
    if (v === undefined) continue;
    if (v === MASK) {
      out[f] = existing?.[f];
    } else if (typeof v === 'string' && v.length > 0) {
      out[f] = await encryption.encrypt(v);
    }
  }
  return out;
}

async function decryptSensitiveFields(
  channel: Channel,
  config: Record<string, unknown>,
  encryption: MessagingEncryptionService,
): Promise<Record<string, unknown>> {
  const out = { ...config };
  for (const f of SENSITIVE_FIELDS[channel]) {
    const v = out[f];
    if (typeof v === 'string' && v.length > 0) {
      try {
        out[f] = await encryption.decrypt(v);
      } catch {
        // leave as-is — cannot decrypt (wrong key / legacy plaintext)
      }
    }
  }
  return out;
}

function toEmailTemplateDto(r: typeof schema.messagingEmailTemplates.$inferSelect) {
  return {
    id: r.id,
    identifier: r.identifier,
    name: r.name,
    subject: r.subject,
    body: r.body,
    fromAddress: r.fromAddress,
    toAddress: r.toAddress,
    ccAddress: r.ccAddress,
    bccAddress: r.bccAddress,
    variables: r.variables,
    description: r.description,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function toTemplateDto(r: typeof schema.messagingTemplates.$inferSelect) {
  return {
    id: r.id,
    channel: r.channel,
    identifier: r.identifier,
    name: r.name,
    body: r.body,
    variables: r.variables,
    description: r.description,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function toCredentialDto(r: typeof schema.messagingCredentials.$inferSelect) {
  return {
    id: r.id,
    channel: r.channel,
    provider: r.provider,
    name: r.name,
    config: maskConfig(r.channel as Channel, (r.config as Record<string, unknown>) ?? {}),
    isActive: r.isActive,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function toLogDto(r: typeof schema.messagingSendLogs.$inferSelect) {
  return {
    id: r.id,
    channel: r.channel,
    identifier: r.identifier,
    templateId: r.templateId,
    status: r.status,
    toAddress: r.toAddress,
    ccAddress: r.ccAddress,
    bccAddress: r.bccAddress,
    renderedSubject: r.renderedSubject,
    renderedBody: r.renderedBody,
    errorMessage: r.errorMessage,
    providerResponse: r.providerResponse,
    relatedEntityType: r.relatedEntityType,
    relatedEntityId: r.relatedEntityId,
    sentBy: r.sentBy,
    sentAt: r.sentAt,
    createdAt: r.createdAt,
  };
}

/**
 * Messaging: Email/SMS/WhatsApp template management, provider credentials
 * ("Masters"), and a send-attempt audit trail — ported from servicemate.
 * Read access requires `Read_Messaging`; managing templates/credentials
 * requires the more specific `Manage_MessagingTemplates` /
 * `Manage_MessagingCredentials`; triggering an actual send requires
 * `Send_Messaging`.
 */
export function createMessagingRouter(
  db: DrizzleDb,
  deps: {
    requireAuth: RequestHandler;
    requirePermission: (perm: string) => RequestHandler;
    encryption: MessagingEncryptionService;
    fallbackEmailService?: EmailService;
    defaultTenantId?: string;
  },
): Router {
  const router = Router();
  const requireRead = deps.requirePermission('Read_Messaging');
  const requireManageTemplates = deps.requirePermission('Manage_MessagingTemplates');
  const requireManageCredentials = deps.requirePermission('Manage_MessagingCredentials');
  const requireSend = deps.requirePermission('Send_Messaging');

  function actor(req: AuthedRequest): { userId: string | null; tenantId: string } {
    return {
      userId: req.maw?.claims.userId ?? null,
      tenantId: req.maw?.claims.tenantId ?? deps.defaultTenantId ?? 'demo-tenant',
    };
  }

  // --- Email Templates ---

  router.get('/email-templates', deps.requireAuth, requireRead, async (_req, res) => {
    try {
      const rows = await db.select().from(schema.messagingEmailTemplates).orderBy(desc(schema.messagingEmailTemplates.updatedAt));
      res.json({ data: rows.map(toEmailTemplateDto) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/email-templates/:id', deps.requireAuth, requireRead, async (req, res) => {
    try {
      const rows = await db.select().from(schema.messagingEmailTemplates).where(eq(schema.messagingEmailTemplates.id, String(req.params.id)));
      if (!rows[0]) return void res.status(404).json({ error: 'Email template not found' });
      res.json({ data: toEmailTemplateDto(rows[0]) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/email-templates', deps.requireAuth, requireManageTemplates, async (req, res) => {
    try {
      const { identifier, name, subject, body, fromAddress, toAddress, ccAddress, bccAddress, variables, description, status } = req.body;
      if (!identifier || !name || !subject || !body) {
        return void res.status(400).json({ error: 'identifier, name, subject, and body are required' });
      }
      const rows = await db
        .insert(schema.messagingEmailTemplates)
        .values({
          identifier, name, subject, body,
          fromAddress: fromAddress || null,
          toAddress: toAddress || null,
          ccAddress: ccAddress || null,
          bccAddress: bccAddress || null,
          variables: variables ?? [],
          description: description || null,
          status: status || 'active',
        })
        .returning();
      res.status(201).json({ data: toEmailTemplateDto(rows[0]!) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.put('/email-templates/:id', deps.requireAuth, requireManageTemplates, async (req, res) => {
    try {
      const { name, subject, body, fromAddress, toAddress, ccAddress, bccAddress, variables, description, status } = req.body;
      const rows = await db
        .update(schema.messagingEmailTemplates)
        .set({
          name, subject, body,
          fromAddress: fromAddress || null,
          toAddress: toAddress || null,
          ccAddress: ccAddress || null,
          bccAddress: bccAddress || null,
          variables: variables ?? [],
          description: description || null,
          status: status || 'active',
          updatedAt: new Date(),
        })
        .where(eq(schema.messagingEmailTemplates.id, String(req.params.id)))
        .returning();
      if (!rows[0]) return void res.status(404).json({ error: 'Email template not found' });
      res.json({ data: toEmailTemplateDto(rows[0]) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.delete('/email-templates/:id', deps.requireAuth, requireManageTemplates, async (req, res) => {
    try {
      await db.delete(schema.messagingEmailTemplates).where(eq(schema.messagingEmailTemplates.id, String(req.params.id)));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // --- SMS / WhatsApp Templates ---

  router.get('/templates', deps.requireAuth, requireRead, async (req, res) => {
    try {
      const channel = req.query.channel as string | undefined;
      const rows = channel
        ? await db.select().from(schema.messagingTemplates).where(eq(schema.messagingTemplates.channel, channel)).orderBy(desc(schema.messagingTemplates.updatedAt))
        : await db.select().from(schema.messagingTemplates).orderBy(desc(schema.messagingTemplates.updatedAt));
      res.json({ data: rows.map(toTemplateDto) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/templates/:id', deps.requireAuth, requireRead, async (req, res) => {
    try {
      const rows = await db.select().from(schema.messagingTemplates).where(eq(schema.messagingTemplates.id, String(req.params.id)));
      if (!rows[0]) return void res.status(404).json({ error: 'Template not found' });
      res.json({ data: toTemplateDto(rows[0]) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/templates', deps.requireAuth, requireManageTemplates, async (req, res) => {
    try {
      const { channel, identifier, name, body, variables, description, status } = req.body;
      if (!channel || !['sms', 'whatsapp'].includes(channel)) {
        return void res.status(400).json({ error: "channel must be 'sms' or 'whatsapp'" });
      }
      if (!identifier || !name || !body) {
        return void res.status(400).json({ error: 'identifier, name, and body are required' });
      }
      const rows = await db
        .insert(schema.messagingTemplates)
        .values({ channel, identifier, name, body, variables: variables ?? [], description: description || null, status: status || 'active' })
        .returning();
      res.status(201).json({ data: toTemplateDto(rows[0]!) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.put('/templates/:id', deps.requireAuth, requireManageTemplates, async (req, res) => {
    try {
      const { name, body, variables, description, status } = req.body;
      const rows = await db
        .update(schema.messagingTemplates)
        .set({ name, body, variables: variables ?? [], description: description || null, status: status || 'active', updatedAt: new Date() })
        .where(eq(schema.messagingTemplates.id, String(req.params.id)))
        .returning();
      if (!rows[0]) return void res.status(404).json({ error: 'Template not found' });
      res.json({ data: toTemplateDto(rows[0]) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.delete('/templates/:id', deps.requireAuth, requireManageTemplates, async (req, res) => {
    try {
      await db.delete(schema.messagingTemplates).where(eq(schema.messagingTemplates.id, String(req.params.id)));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // --- Credentials ("Masters") — one row per channel, upsert semantics ---

  router.get('/credentials', deps.requireAuth, requireManageCredentials, async (_req, res) => {
    try {
      const rows = await db.select().from(schema.messagingCredentials);
      res.json({ data: rows.map(toCredentialDto) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/credentials/:channel', deps.requireAuth, requireManageCredentials, async (req, res) => {
    try {
      const rows = await db.select().from(schema.messagingCredentials).where(eq(schema.messagingCredentials.channel, String(req.params.channel)));
      if (!rows[0]) return void res.status(404).json({ error: 'No credentials configured for this channel' });
      res.json({ data: toCredentialDto(rows[0]) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.put('/credentials/:channel', deps.requireAuth, requireManageCredentials, async (req, res) => {
    try {
      const channel = req.params.channel as Channel;
      if (!['email', 'sms', 'whatsapp'].includes(channel)) {
        return void res.status(400).json({ error: "channel must be 'email', 'sms', or 'whatsapp'" });
      }
      const { provider, name, config, isActive } = req.body;
      if (!provider || !name) {
        return void res.status(400).json({ error: 'provider and name are required' });
      }
      const existingRows = await db.select().from(schema.messagingCredentials).where(eq(schema.messagingCredentials.channel, channel));
      const existingConfig = existingRows[0]?.config as Record<string, unknown> | undefined;
      const encryptedConfig = await encryptSensitiveFields(channel, config ?? {}, existingConfig, deps.encryption);

      let row: typeof schema.messagingCredentials.$inferSelect;
      if (existingRows[0]) {
        const rows = await db
          .update(schema.messagingCredentials)
          .set({ provider, name, config: encryptedConfig, isActive: isActive !== false, updatedAt: new Date() })
          .where(eq(schema.messagingCredentials.channel, channel))
          .returning();
        row = rows[0]!;
      } else {
        const rows = await db
          .insert(schema.messagingCredentials)
          .values({ channel, provider, name, config: encryptedConfig, isActive: isActive !== false })
          .returning();
        row = rows[0]!;
      }
      res.json({ data: toCredentialDto(row) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.delete('/credentials/:channel', deps.requireAuth, requireManageCredentials, async (req, res) => {
    try {
      await db.delete(schema.messagingCredentials).where(eq(schema.messagingCredentials.channel, String(req.params.channel)));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // --- Send Logs (read-only audit trail) ---

  router.get('/logs', deps.requireAuth, requireRead, async (req, res) => {
    try {
      const channel = req.query.channel as string | undefined;
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const rows = channel
        ? await db.select().from(schema.messagingSendLogs).where(eq(schema.messagingSendLogs.channel, channel)).orderBy(desc(schema.messagingSendLogs.createdAt)).limit(limit)
        : await db.select().from(schema.messagingSendLogs).orderBy(desc(schema.messagingSendLogs.createdAt)).limit(limit);
      res.json({ data: rows.map(toLogDto) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // --- Send: render a template + dispatch via the channel's Master credential ---

  router.post('/send/email', deps.requireAuth, requireSend, async (req: AuthedRequest, res) => {
    const { identifier, to, cc, bcc, variables, relatedEntityType, relatedEntityId } = req.body;
    const { userId, tenantId } = actor(req);
    let templateId: string | null = null;
    let renderedSubject = '';
    let renderedBody = '';
    try {
      if (!identifier || !to) return void res.status(400).json({ error: 'identifier and to are required' });
      const templateRows = await db.select().from(schema.messagingEmailTemplates).where(eq(schema.messagingEmailTemplates.identifier, identifier));
      const template = templateRows[0];
      if (!template || template.status !== 'active') return void res.status(404).json({ error: 'Active email template not found' });
      templateId = template.id;

      const vars = variables ?? {};
      renderedSubject = renderer.render(template.subject, vars);
      renderedBody = renderer.render(template.body, vars);

      const credRows = await db.select().from(schema.messagingCredentials).where(and(eq(schema.messagingCredentials.channel, 'email'), eq(schema.messagingCredentials.isActive, true)));
      const cred = credRows[0];

      let result;
      if (cred) {
        const cfg = await decryptSensitiveFields('email', (cred.config as Record<string, unknown>) ?? {}, deps.encryption);
        const provider = new SmtpNotificationProvider({
          host: String(cfg.host ?? ''),
          port: Number(cfg.port ?? 587),
          secure: Boolean(cfg.secure),
          auth: cfg.user && cfg.pass ? { user: String(cfg.user), pass: String(cfg.pass) } : undefined,
        });
        result = await provider.send({
          channel: NotificationChannel.EMAIL,
          metadata: { tenantId },
          email: {
            to, cc, bcc, subject: renderedSubject, body: renderedBody,
            from: (cfg.fromAddress as string | undefined) ?? template.fromAddress ?? undefined,
          },
        });
      } else if (deps.fallbackEmailService) {
        result = await deps.fallbackEmailService.send({
          tenantId,
          email: { to, cc, bcc, subject: renderedSubject, body: renderedBody, from: template.fromAddress ?? undefined },
        });
      } else {
        return void res.status(400).json({ error: 'No Email Master configured and no fallback SMTP available' });
      }

      const logRows = await db.insert(schema.messagingSendLogs).values({
        channel: 'email', identifier, templateId,
        status: result.status === 'SENT' || result.status === 'DELIVERED' ? 'sent' : 'failed',
        toAddress: String(to), ccAddress: cc ? String(cc) : null, bccAddress: bcc ? String(bcc) : null,
        renderedSubject, renderedBody, errorMessage: result.error ?? null,
        providerResponse: result.metadata ?? null,
        relatedEntityType: relatedEntityType || null, relatedEntityId: relatedEntityId || null,
        sentBy: userId, sentAt: new Date(),
      }).returning();

      res.json({ data: { result, log: toLogDto(logRows[0]!) } });
    } catch (err) {
      const errorMessage = (err as Error).message;
      await db.insert(schema.messagingSendLogs).values({
        channel: 'email', identifier: identifier ?? null, templateId,
        status: 'failed', toAddress: to ? String(to) : null,
        renderedSubject, renderedBody, errorMessage,
        relatedEntityType: relatedEntityType || null, relatedEntityId: relatedEntityId || null,
        sentBy: userId, sentAt: new Date(),
      }).catch(() => undefined);
      res.status(500).json({ error: errorMessage });
    }
  });

  router.post('/send/sms', deps.requireAuth, requireSend, async (req: AuthedRequest, res) => {
    const { identifier, to, variables, relatedEntityType, relatedEntityId } = req.body;
    const { userId, tenantId } = actor(req);
    let templateId: string | null = null;
    let renderedBody = '';
    try {
      if (!identifier || !to) return void res.status(400).json({ error: 'identifier and to are required' });
      const templateRows = await db.select().from(schema.messagingTemplates).where(and(eq(schema.messagingTemplates.channel, 'sms'), eq(schema.messagingTemplates.identifier, identifier)));
      const template = templateRows[0];
      if (!template || template.status !== 'active') return void res.status(404).json({ error: 'Active SMS template not found' });
      templateId = template.id;
      renderedBody = renderer.render(template.body, variables ?? {});

      const credRows = await db.select().from(schema.messagingCredentials).where(and(eq(schema.messagingCredentials.channel, 'sms'), eq(schema.messagingCredentials.isActive, true)));
      const cred = credRows[0];
      if (!cred) return void res.status(400).json({ error: 'SMS Master not configured' });
      const cfg = await decryptSensitiveFields('sms', (cred.config as Record<string, unknown>) ?? {}, deps.encryption);

      const provider = new HttpSmsProvider({
        baseUrl: String(cfg.baseUrl ?? ''),
        method: (cfg.method as 'GET' | 'POST') ?? 'POST',
        apiKey: cfg.apiKey ? String(cfg.apiKey) : undefined,
        authHeader: cfg.authHeader ? String(cfg.authHeader) : undefined,
        authScheme: cfg.authScheme ? String(cfg.authScheme) : undefined,
        toField: cfg.toField ? String(cfg.toField) : undefined,
        messageField: cfg.messageField ? String(cfg.messageField) : undefined,
      });
      const result = await provider.send({ channel: NotificationChannel.SMS, metadata: { tenantId }, sms: { to, message: renderedBody } });

      const logRows = await db.insert(schema.messagingSendLogs).values({
        channel: 'sms', identifier, templateId,
        status: result.status === 'SENT' || result.status === 'DELIVERED' ? 'sent' : 'failed',
        toAddress: String(to), renderedBody, errorMessage: result.error ?? null,
        providerResponse: result.metadata ?? null,
        relatedEntityType: relatedEntityType || null, relatedEntityId: relatedEntityId || null,
        sentBy: userId, sentAt: new Date(),
      }).returning();

      res.json({ data: { result, log: toLogDto(logRows[0]!) } });
    } catch (err) {
      const errorMessage = (err as Error).message;
      await db.insert(schema.messagingSendLogs).values({
        channel: 'sms', identifier: identifier ?? null, templateId,
        status: 'failed', toAddress: to ? String(to) : null, renderedBody, errorMessage,
        relatedEntityType: relatedEntityType || null, relatedEntityId: relatedEntityId || null,
        sentBy: userId, sentAt: new Date(),
      }).catch(() => undefined);
      res.status(500).json({ error: errorMessage });
    }
  });

  router.post('/send/whatsapp', deps.requireAuth, requireSend, async (req: AuthedRequest, res) => {
    const { identifier, to, variables, relatedEntityType, relatedEntityId } = req.body;
    const { userId, tenantId } = actor(req);
    let templateId: string | null = null;
    let renderedBody = '';
    try {
      if (!identifier || !to) return void res.status(400).json({ error: 'identifier and to are required' });
      const templateRows = await db.select().from(schema.messagingTemplates).where(and(eq(schema.messagingTemplates.channel, 'whatsapp'), eq(schema.messagingTemplates.identifier, identifier)));
      const template = templateRows[0];
      if (!template || template.status !== 'active') return void res.status(404).json({ error: 'Active WhatsApp template not found' });
      templateId = template.id;
      renderedBody = renderer.render(template.body, variables ?? {});

      const credRows = await db.select().from(schema.messagingCredentials).where(and(eq(schema.messagingCredentials.channel, 'whatsapp'), eq(schema.messagingCredentials.isActive, true)));
      const cred = credRows[0];
      const cfg = cred ? await decryptSensitiveFields('whatsapp', (cred.config as Record<string, unknown>) ?? {}, deps.encryption) : {};
      const mode = (cfg.mode as 'link' | 'api' | undefined) ?? 'link';

      const provider = new HttpWhatsAppProvider({
        mode,
        baseUrl: cfg.baseUrl ? String(cfg.baseUrl) : undefined,
        apiKey: cfg.apiKey ? String(cfg.apiKey) : undefined,
        authHeader: cfg.authHeader ? String(cfg.authHeader) : undefined,
        authScheme: cfg.authScheme ? String(cfg.authScheme) : undefined,
        toField: cfg.toField ? String(cfg.toField) : undefined,
        messageField: cfg.messageField ? String(cfg.messageField) : undefined,
      });
      // WhatsAppRequest has no free-text body field — we reuse templateId to carry
      // the already-rendered message text through to the provider (see
      // HttpWhatsAppProvider's send()).
      const result = await provider.send({ channel: NotificationChannel.WHATSAPP, metadata: { tenantId }, whatsApp: { to, templateId: renderedBody } });

      const logRows = await db.insert(schema.messagingSendLogs).values({
        channel: 'whatsapp', identifier, templateId,
        status: result.status === 'SENT' || result.status === 'DELIVERED' ? 'sent' : 'failed',
        toAddress: String(to), renderedBody, errorMessage: result.error ?? null,
        providerResponse: result.metadata ?? null,
        relatedEntityType: relatedEntityType || null, relatedEntityId: relatedEntityId || null,
        sentBy: userId, sentAt: new Date(),
      }).returning();

      res.json({ data: { result, log: toLogDto(logRows[0]!) } });
    } catch (err) {
      const errorMessage = (err as Error).message;
      await db.insert(schema.messagingSendLogs).values({
        channel: 'whatsapp', identifier: identifier ?? null, templateId,
        status: 'failed', toAddress: to ? String(to) : null, renderedBody, errorMessage,
        relatedEntityType: relatedEntityType || null, relatedEntityId: relatedEntityId || null,
        sentBy: userId, sentAt: new Date(),
      }).catch(() => undefined);
      res.status(500).json({ error: errorMessage });
    }
  });

  return router;
}
