import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

const isTest = config.nodeEnv === 'test';

// Under Jest no SMTP server is needed: mails are only collected in the outbox below
const transport = isTest
  ? null
  : nodemailer.createTransport({
      host: config.mail.smtp.host,
      port: config.mail.smtp.port,
      secure: config.mail.smtp.secure,
      auth: config.mail.smtp.user
        ? { user: config.mail.smtp.user, pass: config.mail.smtp.password }
        : undefined,
    });

/**
 * Test only: every mail "sent" under Jest, newest last.
 * @type {{ to: string, subject: string, text: string, html: string }[]}
 */
export const outbox = [];

/**
 * @param {{ to: string, subject: string, text: string, html: string }} mail
 */
export const sendMail = async (mail) => {
  if (isTest) {
    outbox.push(mail);
    return;
  }
  await transport.sendMail({ from: config.mail.from, ...mail });
};

/**
 * Sends without making the request wait: a slow or unreachable mail server must not
 * fail a registration, and the response time must not reveal whether an account exists.
 * Failures are only logged (a real project would use a job queue with retries).
 */
export const sendMailInBackground = (mail) => {
  sendMail(mail).catch((error) => {
    console.error(`Failed to send mail "${mail.subject}" to ${mail.to}:`, error.message);
  });
};

export default { sendMail, sendMailInBackground, outbox };
