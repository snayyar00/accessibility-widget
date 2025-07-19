import { Request, Response } from 'express';
import { sendMail } from '~/services/email/email.service';
import { emailValidation } from '~/validations/email.validation';
import { addNewsletterSub } from '~/repository/newsletter_subscribers.repository';

export async function handleFormSubmission(req: Request, res: Response) {
  const validateResult = emailValidation(req.body.email);

  if (Array.isArray(validateResult) && validateResult.length) {
    return res.status(400).json({ error: validateResult.map((it) => it.message).join(',') });
  }

  try {
    await sendMail(
      req.body.email,
      'Welcome to Webability',
      `
          <html>
          <head>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  margin: 20px;
                  color: #333333;
              }
              .script-box {
                  background-color: #f4f4f4;
                  border: 1px solid #dddddd;
                  padding: 15px;
                  overflow: auto;
                  font-family: monospace;
                  margin-top: 20px;
                  white-space: pre-wrap;
              }
              .instructions {
                  margin-bottom: 10px;
              }
          </style>
      </head>
      <body>
          <h1>Welcome to Webability!</h1>
          <p class="instructions">To get started with Webability on your website, please follow these steps:</p>
          <ol>
              <li>Copy the script code provided below.</li>
              <li>Paste it into the HTML of your website, preferably near the closing &lt;/body&gt; tag.</li>
          </ol>
          <div class="script-box">
              &lt;script src="https://widget.webability.io/widget.min.js" data-asw-position="bottom-left" data-asw-lang="en" defer&gt;&lt;/script&gt;
          </div>
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          <p>Thank you for choosing Webability!</p>
      </body>
          </html>
      `,
    );

    return res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}

export async function subscribeNewsletter(req: Request, res: Response) {
  try {
    const { email } = req.body;
    const validateResult = emailValidation(email);

    if (Array.isArray(validateResult) && validateResult.length) {
      return res.status(400).json({ error: validateResult.map((it) => it.message).join(',') });
    }

    await addNewsletterSub(email);
    res.status(200).json({ message: 'Subscription successful' });
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
