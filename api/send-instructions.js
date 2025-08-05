const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Email configuration - replace with your actual email service credentials
const transporter = nodemailer.createTransporter({
  service: 'gmail', // or your preferred email service
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// Alternative: Using SendGrid
// const sgMail = require('@sendgrid/mail');
// sgMail.setApiKey(process.env.SENDGRID_API_KEY);

app.post('/api/send-instructions', async (req, res) => {
  try {
    const { 
      email, 
      subject, 
      html, 
      code, 
      position, 
      language, 
      languageName 
    } = req.body;

    // Validate required fields
    if (!email || !html) {
      return res.status(400).json({ 
        error: 'Email and HTML content are required' 
      });
    }

    // Email options
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@webability.io',
      to: email,
      subject: subject || '🚀 Your WebAbility Widget Installation Instructions',
      html: html,
      // Optional: Add text version for email clients that don't support HTML
      text: `
WebAbility Widget Installation Instructions

Installation Code:
${code}

Configuration:
- Position: ${position}
- Language: ${languageName}

Step-by-Step Installation:
1. Access Your Website Files
2. Locate the Body Tag
3. Paste the Code
4. Save and Test

For support, contact: support@webability.io
      `
    };

    // Send email using Nodemailer
    const info = await transporter.sendMail(mailOptions);

    // Alternative: Using SendGrid
    // const msg = {
    //   to: email,
    //   from: process.env.EMAIL_FROM || 'noreply@webability.io',
    //   subject: subject || '🚀 Your WebAbility Widget Installation Instructions',
    //   html: html,
    //   text: mailOptions.text
    // };
    // await sgMail.send(msg);

    console.log('Email sent successfully:', info.messageId);

    res.json({ 
      success: true, 
      messageId: info.messageId,
      message: 'Installation instructions sent successfully!' 
    });

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      error: 'Failed to send email. Please try again.',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Email service is running' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Email service running on port ${PORT}`);
});

module.exports = app; 