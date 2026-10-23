const nodemailer = require('nodemailer');

function resetEmail({ code, minutes }) {
  const subject = 'Your Enfield Royal Clinics verification code';
  const text = [
    `Your verification code is ${code}.`,
    '',
    `It expires in ${minutes} minutes. If you did not ask to reset your password, you can ignore this email.`,
    '',
    'Enfield Royal Clinics',
  ].join('\n');
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1F1B16">
    <h2 style="margin:0 0 12px;font-size:20px">Reset your password</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#555">Use this code to verify your account:</p>
    <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#BF824F;background:#FFF8F1;border-radius:12px;padding:16px;text-align:center">${code}</div>
    <p style="margin:16px 0 0;font-size:13px;color:#8D8680">The code expires in ${minutes} minutes. If you did not ask to reset your password, you can ignore this email.</p>
    <p style="margin:24px 0 0;font-size:13px;color:#8D8680">Enfield Royal Clinics</p>
  </div>`;
  return { subject, text, html };
}

function createMailer(smtp, { isProduction }) {
  if (!smtp.host) {
    if (isProduction) {
      throw new Error('SMTP_HOST is required in production.');
    }
    console.warn('[mail] SMTP_HOST not set: reset codes will be printed here instead of emailed.');
    return {
      async sendResetCode({ to, code, minutes }) {
        console.log(`[mail:dev] Reset code for ${to}: ${code} (expires in ${minutes} min)`);
      },
      async sendMail({ to, subject, text, html }) {
        console.log(`[mail:dev] To ${to}: ${subject}\n${text || ''}`);
      },
    };
  }

  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
    // Fail fast so the app (10 s timeout) gets a clear error instead of hanging.
    connectionTimeout: 7000,
    greetingTimeout: 7000,
    socketTimeout: 8000,
  });

  return {
    async sendResetCode({ to, code, minutes }) {
      const { subject, text, html } = resetEmail({ code, minutes });
      await transport.sendMail({ from: smtp.from, to, subject, text, html });
    },
    async sendMail({ to, subject, text, html }) {
      await transport.sendMail({ from: smtp.from, to, subject, text, html });
    },
    verify: () => transport.verify(),
  };
}

module.exports = { createMailer, resetEmail };
