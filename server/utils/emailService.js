import sgMail from '@sendgrid/mail';

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
let isSimulationMode = false;

const getDeliveryMode = () => {
  if (toBoolean(env.EMAIL_SIMULATION)) {
    isSimulationMode = true;
    return 'simulation';
  }

  if (env.SENDGRID_API_KEY && env.SENDGRID_FROM_EMAIL) {
    isSimulationMode = false;
    return 'sendgrid';
  }

  throw new Error('SendGrid is not configured. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL, or set EMAIL_SIMULATION=true for local testing.');
};

const initializeSendGrid = () => {
  if (!cachedTransporter) {
    sgMail.setApiKey(env.SENDGRID_API_KEY);
    cachedTransporter = sgMail;
  }

  return cachedTransporter;
};

export const getBulkEmailFromAddress = () => {
  return env.SENDGRID_FROM_EMAIL || 'no-reply@postgraduate-lms.local';
};

const getBulkEmailFromName = () => {
  return String(env.SENDGRID_FROM_NAME || '').trim();
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

const sendWithSendGrid = async ({ recipient, subject, personalizedContent }) => {
  const client = initializeSendGrid();
  const fromAddress = getBulkEmailFromAddress();
  const fromName = getBulkEmailFromName();
  const from = fromName ? { email: fromAddress, name: fromName } : fromAddress;
  const replyTo = env.SENDGRID_REPLY_TO || fromAddress;

  const [response] = await client.send({
    to: recipient.email,
    from,
    replyTo,
    subject,
    text: personalizedContent,
    html: buildHtmlBody(personalizedContent)
  });

  return response?.headers?.['x-message-id'] || null;
};

const sendInSimulationMode = ({ recipient, subject, personalizedContent }) => {
  console.info('Bulk email simulation', {
    to: recipient.email,
    subject,
    preview: personalizedContent.slice(0, 120)
  });

  return `simulated-${recipient.applicationId || Date.now()}`;
};

export const sendBulkEmail = async ({ recipients, subject, content, programName }) => {
  const deliveryMode = getDeliveryMode();

  const sendResults = await Promise.allSettled(
    recipients.map(async (recipient) => {
      const personalizedContent = applyTemplateTokens(content, recipient, programName);
      const messageId = deliveryMode === 'sendgrid'
        ? await sendWithSendGrid({ recipient, subject, personalizedContent })
        : await sendInSimulationMode({ recipient, subject, personalizedContent });

      return {
        applicationId: recipient.applicationId,
        fullName: recipient.fullName,
        email: recipient.email,
        messageId
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
    isSimulated: isSimulationMode
  };
};