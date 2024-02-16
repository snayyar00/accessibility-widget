import nodemailer from 'nodemailer';

export default async function sendMail(to: string, subject: string, html: string) {
  if (!to || to.trim() === '') {
    console.error('Recipient email address is missing or empty.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10),
    secure: process.env.EMAIL_SECURE === 'true', // should be true if EMAIL_PORT is 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  } as nodemailer.TransportOptions);

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: to,
    subject: subject,
    text: html
  };

  try {
    const info: any = await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
