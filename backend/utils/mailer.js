import nodemailer from 'nodemailer';

let transporter; // cached so we don't rebuild it on every send

export async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    // Real provider (set these in .env when you're ready to send for real)
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  } else {
    // Dev fallback: Ethereal — a fake inbox that captures emails instead
    // of sending them, and gives you a preview link in the console.
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log('📧 No SMTP_HOST set — using Ethereal test account for emails');
  }

  return transporter;
}

export async function sendVerificationEmail(to, code) {
  const mailer = await getTransporter();

  const info = await mailer.sendMail({
    from: process.env.MAIL_FROM || '"Ummah Professionals" <no-reply@ummahprofessionals.org>',
    to,
    subject: 'Your Ummah Professionals verification code',
    text: `Your verification code is ${code}. It expires in 1 hour.`,
    html: `
      <div style="font-family: sans-serif; color: #00212C;">
        <h2 style="color: #007CA6;">Verify your email</h2>
        <p>Your verification code is:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #00212C;">${code}</p>
        <p style="color: #007CA6;">This code expires in 1 hour.</p>
      </div>
    `,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) console.log('🔗 Preview the email here:', previewUrl);

  return info;
}

// Sent when someone receives a new chat message. The messaging routes throttle
// this to at most once per hour per person per conversation, so a burst of
// messages doesn't turn into a burst of emails.
export async function sendNewMessageEmail(to, { senderName, preview }) {
  const mailer = await getTransporter();

  const safePreview = (preview || '').slice(0, 140);

  const info = await mailer.sendMail({
    from: process.env.MAIL_FROM || '"Ummah Professionals" <no-reply@ummahprofessionals.org>',
    to,
    subject: `New message from ${senderName} on Ummah Professionals`,
    text: `${senderName} sent you a new message:\n\n"${safePreview}"\n\nLog in to Ummah Professionals to reply.`,
    html: `
      <div style="font-family: sans-serif; color: #00212C;">
        <h2 style="color: #007CA6;">You have a new message</h2>
        <p><strong>${senderName}</strong> sent you a message:</p>
        <blockquote style="border-left: 3px solid #007CA6; margin: 12px 0; padding: 4px 12px; color: #00212C;">
          ${safePreview}
        </blockquote>
        <p style="color: #007CA6;">Log in to Ummah Professionals to read it and reply.</p>
      </div>
    `,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) console.log('🔗 Preview the email here:', previewUrl);

  return info;
}
