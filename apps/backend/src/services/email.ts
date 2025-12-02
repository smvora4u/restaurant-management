import * as dotenv from 'dotenv';
import * as nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import { generatePasswordResetEmail, PasswordResetEmailData } from '../templates/passwordResetEmail.js';

// Load environment variables
dotenv.config();

// Configure SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Configure Nodemailer for Gmail
const createGmailTransporter = () => {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
};

export interface EmailConfig {
  service: 'gmail' | 'sendgrid';
  from: string;
  fromName: string;
  frontendUrl: string;
}

export function getEmailConfig(): EmailConfig {
  const service = (process.env.EMAIL_SERVICE as 'gmail' | 'sendgrid') || 'gmail';
  const from = process.env.EMAIL_FROM || process.env.GMAIL_USER || 'noreply@restrowise.com';
  const fromName = process.env.EMAIL_FROM_NAME || 'Restrowise Management';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  return {
    service,
    from,
    fromName,
    frontendUrl
  };
}

export async function sendPasswordResetEmail(
  email: string, 
  resetToken: string, 
  userType: 'admin' | 'restaurant' | 'staff'
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = getEmailConfig();
    const emailData: PasswordResetEmailData = {
      email,
      resetToken,
      userType,
      frontendUrl: config.frontendUrl
    };

    const emailContent = generatePasswordResetEmail(emailData);

    if (config.service === 'sendgrid') {
      // Use SendGrid for production
      if (!process.env.SENDGRID_API_KEY) {
        throw new Error('SendGrid API key not configured');
      }

      const msg = {
        to: email,
        from: {
          email: config.from,
          name: config.fromName
        },
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html
      };

      await sgMail.send(msg);
      console.log(`✅ Password reset email sent via SendGrid to ${email}`);

    } else {
      // Use Gmail for development/testing
      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        throw new Error('Gmail credentials not configured');
      }

      const transporter = createGmailTransporter();

      const mailOptions = {
        from: {
          name: config.fromName,
          address: config.from
        },
        to: email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent via Gmail to ${email}`);
    }

    return { success: true };

  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Test email configuration
export async function testEmailConfiguration(): Promise<{ success: boolean; error?: string; service?: string }> {
  try {
    const config = getEmailConfig();
    
    if (config.service === 'sendgrid') {
      if (!process.env.SENDGRID_API_KEY) {
        throw new Error('SendGrid API key not configured');
      }
      
      // Test SendGrid with a simple API call
      await sgMail.send({
        to: 'test@example.com',
        from: config.from,
        subject: 'Test Email',
        text: 'This is a test email'
      });
      
    } else {
      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        throw new Error('Gmail credentials not configured');
      }
      
      const transporter = createGmailTransporter();
      await transporter.verify();
    }
    
    return { success: true, service: config.service };
    
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      service: getEmailConfig().service
    };
  }
}
