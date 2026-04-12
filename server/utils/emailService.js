// server/utils/emailService.js
// Email service using Nodemailer for password reset emails
// =========================================================

const nodemailer = require('nodemailer');

// Create a reusable transporter object using SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: false, // true for port 465, false for port 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Send a password reset email to the user.
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.firstName - User's first name for personalization
 * @param {string} options.resetUrl - The full password reset URL with token
 */
const sendResetEmail = async ({ to, firstName, resetUrl }) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"Leave Manager" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Password Reset Request – Leave Management System',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Password Reset</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Hello <strong>${firstName}</strong>,
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            We received a request to reset your password. Click the button below to create a new password:
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
              Reset My Password
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            This link will expire in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">
            If the button doesn't work, copy and paste this URL into your browser:<br/>
            <a href="${resetUrl}" style="color: #6366f1; word-break: break-all;">${resetUrl}</a>
          </p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendResetEmail };
