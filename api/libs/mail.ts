// import nodemailer from 'nodemailer';

// export default async function sendMail(to: string, subject: string, html: string) {
//   if (!to || to.trim() === '') {
//     console.error('Recipient email address is missing or empty.');
//     return;
//   }

//   const transporter = nodemailer.createTransport({
//     host: process.env.EMAIL_HOST,
//     port: parseInt(process.env.EMAIL_PORT, 10),
//     secure: process.env.EMAIL_SECURE === 'true', // should be true if EMAIL_PORT is 465
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS,
//     },
//   } as nodemailer.TransportOptions);

//   const mailOptions = {
//     from: process.env.EMAIL_FROM,
//     to: to,
//     subject: subject,
//     text: html
//   };

//   try {
//     const info: any = await transporter.sendMail(mailOptions);
//     return true;
//   } catch (error) {
//     console.error('Error sending email:', error);
//     return false;
//   }
// }

import { TransactionalEmailsApi, SendSmtpEmail, TransactionalEmailsApiApiKeys } from '@getbrevo/brevo';


export default async function sendMail(to: string, subject: string, html: string) {
  if (!to || to.trim() === '') {
    console.error('Recipient email address is missing or empty.');
    return false;
  }

  try {
    // Initialize Brevo API client
    const brevoClient = new TransactionalEmailsApi();
    
    // Correctly set the API key using two arguments
    brevoClient.setApiKey(TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY as string);

    // Create the email content
    const sendSmtpEmail = new SendSmtpEmail();
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.sender = { email: process.env.EMAIL_FROM || 'your-email@domain.com' };
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;

    // Send the email via Brevo's API
    const response = await brevoClient.sendTransacEmail(sendSmtpEmail);

    console.log('Email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
