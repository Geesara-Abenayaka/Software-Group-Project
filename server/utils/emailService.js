import nodemailer from 'nodemailer';

const TRUE_VALUES = new Set(['true', '1', 'yes', 'on']);

const toBoolean = (value) => TRUE_VALUES.has(String(value || '').trim().toLowerCase());
const env = globalThis.process?.env || {};

const escapeHtml = (value = '') => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

let cachedTransporter = null;
let isJsonTransport = false;

const buildTransportConfig = () => {
  const host = env.SMTP_HOST;
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS;
  const port = Number(env.SMTP_PORT || 587);
  const secure = env.SMTP_SECURE ? toBoolean(env.SMTP_SECURE) : port === 465;

  if (host && user && pass) {
    isJsonTransport = false;
    return {
      host,
      port,
      secure,
      auth: {
        user,
        pass
      }
    };
  }

  if (toBoolean(env.EMAIL_SIMULATION)) {
    // Explicitly enabled simulation mode for local UI development.
    isJsonTransport = true;
    return {
      jsonTransport: true
    };
  }

  throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS and optionally SMTP_PORT/SMTP_SECURE.');
};

export const getEmailTransporter = () => {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport(buildTransportConfig());
  }

  return cachedTransporter;
};

export const getBulkEmailFromAddress = () => {
  return env.SMTP_FROM || env.SMTP_USER || 'no-reply@postgraduate-lms.local';
};

const applyTemplateTokens = (content, recipient, programName) => {
  return content
    .replace(/\{\{\s*name\s*\}\}/gi, recipient.fullName || 'Applicant')
    .replace(/\{\{\s*program\s*\}\}/gi, programName || 'your selected program')
    .replace(/\{\{\s*status\s*\}\}/gi, recipient.status || 'pending')
    .replace(/\{\{\s*applicationId\s*\}\}/gi, recipient.applicationId || '');
};

const buildHtmlBody = (content) => {
  return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1f2937;">
      ${escapeHtml(content).replace(/\n/g, '<br />')}
    </div>
  `;
};

export const sendBulkEmail = async ({ recipients, subject, content, programName }) => {
  const transporter = getEmailTransporter();
  const from = getBulkEmailFromAddress();

  const sendResults = await Promise.allSettled(
    recipients.map(async (recipient) => {
      const personalizedContent = applyTemplateTokens(content, recipient, programName);
      const info = await transporter.sendMail({
        from,
        to: recipient.email,
        subject,
        text: personalizedContent,
        html: buildHtmlBody(personalizedContent)
      });

      return {
        applicationId: recipient.applicationId,
        fullName: recipient.fullName,
        email: recipient.email,
        messageId: info.messageId || null
      };
    })
  );

  const sentRecipients = [];
  const failedRecipients = [];

  sendResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      sentRecipients.push(result.value);
      return;
    }

    const failedRecipient = recipients[index];
    failedRecipients.push({
      applicationId: failedRecipient.applicationId,
      fullName: failedRecipient.fullName,
      email: failedRecipient.email,
      reason: result.reason?.message || 'Unknown email delivery error'
    });
  });

  return {
    sentCount: sentRecipients.length,
    failedCount: failedRecipients.length,
    sentRecipients,
    failedRecipients,
    isSimulated: isJsonTransport
  };
};