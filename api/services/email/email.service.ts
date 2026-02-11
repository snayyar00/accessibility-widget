/**
 * Email sending: Brevo (global default) and per-org SMTP.
 * - When an organization has SMTP configured in settings (e.g. Hostinger), emails for that org use org SMTP.
 * - When no org SMTP is set (or send has no org context), Brevo is used.
 * - If org SMTP is set but sending fails, we fall back to Brevo.
 */
import nodemailer from 'nodemailer'

import { SendSmtpEmail, TransactionalEmailsApi, TransactionalEmailsApiApiKeys } from '@getbrevo/brevo'

import type { OrganizationEmailContext, OrganizationSmtpConfig } from '../../utils/organizationSmtp.utils'

export interface EmailAttachment {
  content: Buffer
  name: string
}

type SendMailOptions = {
  attachments?: EmailAttachment[]
  senderName?: string
  smtpConfig?: OrganizationEmailContext | null
}

function hasSmtpCredentials(c: OrganizationEmailContext): c is OrganizationSmtpConfig {
  return 'user' in c && typeof (c as { user?: string }).user === 'string' && 'password' in c
}

async function sendViaOrgSmtp(
  to: string,
  subject: string,
  html: string,
  opts: SendMailOptions,
): Promise<boolean> {
  const { smtpConfig, attachments, senderName = 'WebAbility' } = opts
  if (!smtpConfig || !hasSmtpCredentials(smtpConfig)) return false

  try {
    const host = (smtpConfig.host || '').trim() 
    const transporter = nodemailer.createTransport({
      host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: (smtpConfig.user || '').trim(),
        pass: smtpConfig.password,
      },
    })

    const fromName = smtpConfig.organizationName || smtpConfig.fromName || senderName
    const from = fromName ? `${fromName} <${smtpConfig.user}>` : smtpConfig.user

    const mailOptions: nodemailer.SendMailOptions = {
      from,
      to,
      subject,
      html,
    }
    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments.map((att) => ({
        filename: att.name,
        content: att.content,
      }))
    }

    const info = await transporter.sendMail(mailOptions)
    if (info.messageId) {
      console.log('Email sent via org SMTP:', info.messageId)
      return true
    }
    return false
  } catch (error) {
    console.error('Error sending email via org SMTP:', error)
    return false
  }
}

async function sendViaBrevo(
  to: string,
  subject: string,
  html: string,
  attachments?: EmailAttachment[],
  senderName: string = 'WebAbility',
): Promise<boolean> {
  try {
    const brevoClient = new TransactionalEmailsApi()
    brevoClient.setApiKey(TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY as string)

    const sendSmtpEmail = new SendSmtpEmail()
    sendSmtpEmail.to = [{ email: to }]
    sendSmtpEmail.sender = {
      email: process.env.EMAIL_FROM || 'your-email@domain.com',
      name: senderName,
    }
    sendSmtpEmail.subject = subject
    sendSmtpEmail.htmlContent = html
    if (attachments && attachments.length > 0) {
      sendSmtpEmail.attachment = attachments.map((att) => ({
        content: att.content.toString('base64'),
        name: att.name,
      }))
    }

    const response = await brevoClient.sendTransacEmail(sendSmtpEmail)
    if (response?.body?.messageId) {
      console.log('Email sent successfully:', response.body.messageId)
      return true
    }
    console.error('Failed to send email: no messageId in response')
    return false
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}

async function sendMail(
  to: string,
  subject: string,
  html: string,
  attachments?: EmailAttachment[],
  senderName: string = 'WebAbility',
  smtpConfig?: OrganizationEmailContext | null,
): Promise<boolean> {
  if (!to || to.trim() === '') {
    console.error('Recipient email address is missing or empty.')
    return false
  }

  const opts: SendMailOptions = { attachments, senderName, smtpConfig }

  // If org has SMTP configured, use it; otherwise use Brevo (default)
  const effectiveSenderName = smtpConfig?.organizationName || (smtpConfig as { fromName?: string } | undefined)?.fromName || senderName
  if (smtpConfig && hasSmtpCredentials(smtpConfig)) {
    const sent = await sendViaOrgSmtp(to, subject, html, opts)
    if (sent) return true
    // Fallback to Brevo if org SMTP fails (optional: remove to fail instead)
    console.warn('Org SMTP failed, falling back to Brevo')
  }

  return sendViaBrevo(to, subject, html, attachments, effectiveSenderName)
}

async function sendMailMultiple(
  recipients: string[],
  subject: string,
  html: string,
  attachments?: EmailAttachment[],
  senderName: string = 'WebAbility',
  smtpConfig?: OrganizationEmailContext | null,
): Promise<boolean> {
  if (!recipients || recipients.length === 0) {
    console.error('No recipients provided.')
    return false
  }

  const opts: SendMailOptions = { attachments, senderName, smtpConfig }

  if (smtpConfig && hasSmtpCredentials(smtpConfig)) {
    try {
      const host = (smtpConfig.host || '').trim()
      const transporter = nodemailer.createTransport({
        host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: { user: (smtpConfig.user || '').trim(), pass: smtpConfig.password },
      })
      const fromName = smtpConfig.organizationName || smtpConfig.fromName || senderName
      const from = fromName ? `${fromName} <${smtpConfig.user}>` : smtpConfig.user
      const mailOptions: nodemailer.SendMailOptions = {
        from,
        to: recipients,
        subject,
        html,
      }
      if (attachments?.length) {
        mailOptions.attachments = attachments.map((att) => ({ filename: att.name, content: att.content }))
      }
      const info = await transporter.sendMail(mailOptions)
      if (info.messageId) {
        console.log('Email sent to multiple recipients via org SMTP:', info.messageId)
        return true
      }
    } catch (error) {
      console.error('Error sending to multiple via org SMTP:', error)
    }
    console.warn('Org SMTP failed for multiple, falling back to Brevo')
  }

  const effectiveSenderName = smtpConfig?.organizationName || (smtpConfig as { fromName?: string } | undefined)?.fromName || senderName
  try {
    const brevoClient = new TransactionalEmailsApi()
    brevoClient.setApiKey(TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY as string)
    const sendSmtpEmail = new SendSmtpEmail()
    sendSmtpEmail.to = recipients.map((email) => ({ email }))
    sendSmtpEmail.sender = {
      email: process.env.EMAIL_FROM || 'your-email@domain.com',
      name: effectiveSenderName,
    }
    sendSmtpEmail.subject = subject
    sendSmtpEmail.htmlContent = html
    if (attachments?.length) {
      sendSmtpEmail.attachment = attachments.map((att) => ({
        content: att.content.toString('base64'),
        name: att.name,
      }))
    }
    const response = await brevoClient.sendTransacEmail(sendSmtpEmail)
    if (response?.body?.messageId) {
      console.log('Email sent successfully to multiple recipients:', response.body.messageId)
      return true
    }
  } catch (error) {
    console.error('Error sending email to multiple recipients:', error)
  }
  return false
}

async function sendEmailWithRetries(
  email: string,
  template: string,
  subject: string,
  maxRetries = 3,
  delay = 2000,
  attachments?: EmailAttachment[],
  senderName: string = 'WebAbility',
  smtpConfig?: OrganizationEmailContext | null,
): Promise<void> {
  let attempt = 0

  while (attempt < maxRetries) {
    attempt += 1
    try {
      const ok = await sendMail(email, subject, template, attachments, senderName, smtpConfig)
      if (ok) {
        return
      }
      throw new Error('sendMail returned false')
    } catch (error) {
      if (attempt >= maxRetries) {
        throw new Error(`Failed to send email after ${maxRetries} attempts.`)
      }
      const retryDelay = delay * 2 ** (attempt - 1)
      await new Promise((resolve) => setTimeout(resolve, retryDelay))
    }
  }
}

export { sendEmailWithRetries, sendMail, sendMailMultiple }
