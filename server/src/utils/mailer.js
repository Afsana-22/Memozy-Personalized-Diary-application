const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  }
});

async function sendVerificationEmail(to, token) {
  const verifyUrl = `${process.env.FRONTEND_URL}/api/auth/verify?token=${token}`;
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Verify your email',
    html: `<p>Please verify your email by clicking <a href="${verifyUrl}">here</a>.</p>`
  });
  return info;
}

module.exports = { sendVerificationEmail };
