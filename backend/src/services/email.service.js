const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Create a transporter using SMTP from environment variables or Ethereal for testing
let transporter;

const createTransporter = async () => {
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    logger.info('SMTP Transporter created with provided credentials');
  } else {
    // Generate a test account on the fly if no SMTP credentials are provided
    logger.warn('No SMTP credentials provided in .env, falling back to Ethereal Email for testing');
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }
};

const sendOtpEmail = async (toEmail, otpCode) => {
  if (!transporter) {
    await createTransporter();
  }

  const senderEmail = process.env.SMTP_USER || 'noreply@roadwatch.com';

  const mailOptions = {
    from: `"RoadWatch Admin" <${senderEmail}>`,
    to: toEmail,
    subject: 'Your RoadWatch Verification OTP',
    text: `Your OTP for registering on RoadWatch is: ${otpCode}. It will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #FF6B2C; text-align: center;">RoadWatch</h2>
        <p>Hello,</p>
        <p>Thank you for registering with RoadWatch. To verify your email address, please use the following One-Time Password (OTP):</p>
        <div style="background-color: #f4f4f5; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 5px;">
          ${otpCode}
        </div>
        <p>This code will expire in <strong>10 minutes</strong>.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
        <br/>
        <p style="font-size: 12px; color: #94A3B8; text-align: center;">&copy; ${new Date().getFullYear()} RoadWatch System</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`OTP Email sent successfully to ${toEmail}`);
    if (!process.env.SMTP_HOST) {
      // Ethereal provides a URL to view the sent email
      logger.info(`Preview URL for sent email: ${nodemailer.getTestMessageUrl(info)}`);
    }
    return true;
  } catch (error) {
    logger.error(`Error sending email to ${toEmail}: ${error.message}`);
    throw new Error('Failed to send OTP email');
  }
};

module.exports = {
  sendOtpEmail,
};
