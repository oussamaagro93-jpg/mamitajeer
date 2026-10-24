const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');

let transporter = null;

function isConfigured() {
  return Boolean(
    config.smtp.host &&
    config.smtp.user &&
    config.smtp.pass,
  );
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }
  return transporter;
}

class EmailService {
  async sendPasswordReset(email, token) {
    if (!isConfigured()) {
      logger.warn('SMTP is not configured; password reset email was not sent');
      return { sent: false };
    }

    const resetUrl = config.frontendUrl.replace(/\/+$/, '') + '/reset-password/' + encodeURIComponent(token);
    const subject = 'Reset your password';
    const text = [
      'You requested a password reset for your account.',
      '',
      'Open this link to choose a new password:',
      resetUrl,
      '',
      'The link expires in one hour. If you did not request this, ignore this email.',
    ].join('\n');

    await getTransporter().sendMail({
      from: config.smtp.user,
      to: email,
      subject,
      text,
      html: '<p>You requested a password reset for your account.</p>'
        + '<p><a href="' + resetUrl + '">Choose a new password</a></p>'
        + '<p>The link expires in one hour. If you did not request this, ignore this email.</p>',
    });

    return { sent: true };
  }
}

module.exports = new EmailService();
