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


//the notification email when a meeting is scheduled 
export async function sendMeetingEmail(to, { recipientName, otherPartyName, dateText, purpose, notes }) {
  const mailer = await getTransporter();

  const info = await mailer.sendMail({
    from: process.env.MAIL_FROM || '"Ummah Professionals" <no-reply@ummahprofessionals.org>',
    to,
    subject: 'Your Ummah Professionals meeting is scheduled',
    text: `Hi ${recipientName}, your meeting with ${otherPartyName} is scheduled for ${dateText}.`,
    html: `
      <div style="font-family: sans-serif; color: #00212C;">
        <h2 style="color: #007CA6;">Meeting Scheduled</h2>
        <p>Hi ${recipientName},</p>
        <p>Your meeting with <strong>${otherPartyName}</strong> is confirmed.</p>
        <p><strong>When:</strong> ${dateText}</p>
        ${purpose ? `<p><strong>Purpose:</strong> ${purpose}</p>` : ""}
        ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ""}
        <p style="color: #007CA6;">See you there!</p>
      </div>
    `,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) console.log('🔗 Preview the meeting email here:', previewUrl);

  return info;
}
