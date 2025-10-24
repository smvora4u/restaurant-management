export interface PasswordResetEmailData {
  email: string;
  resetToken: string;
  userType: 'admin' | 'restaurant' | 'staff';
  frontendUrl: string;
}

export function generatePasswordResetEmail(data: PasswordResetEmailData) {
  const { email, resetToken, userType, frontendUrl } = data;
  
  const resetLink = `${frontendUrl}/password-reset?token=${resetToken}&type=${userType}`;
  const userTypeLabel = userType.charAt(0).toUpperCase() + userType.slice(1);
  
  const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - Restaurant Management</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .email-container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #1976d2;
            margin-bottom: 10px;
        }
        .title {
            font-size: 28px;
            font-weight: 600;
            color: #333;
            margin-bottom: 20px;
        }
        .content {
            margin-bottom: 30px;
        }
        .reset-button {
            display: inline-block;
            background-color: #1976d2;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            transition: background-color 0.3s;
        }
        .reset-button:hover {
            background-color: #1565c0;
        }
        .security-info {
            background-color: #f8f9fa;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 4px 4px 0;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            font-size: 14px;
            color: #666;
            text-align: center;
        }
        .link-fallback {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            word-break: break-all;
            margin-top: 15px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">🍽️ Restaurant Management</div>
            <h1 class="title">Password Reset Request</h1>
        </div>
        
        <div class="content">
            <p>Hello,</p>
            
            <p>We received a request to reset the password for your ${userTypeLabel} account (<strong>${email}</strong>).</p>
            
            <p>Click the button below to reset your password:</p>
            
            <div style="text-align: center;">
                <a href="${resetLink}" class="reset-button">Reset My Password</a>
            </div>
            
            <div class="security-info">
                <strong>🔒 Security Information:</strong>
                <ul>
                    <li>This link will expire in <strong>1 hour</strong></li>
                    <li>The link can only be used <strong>once</strong></li>
                    <li>If you didn't request this reset, please ignore this email</li>
                </ul>
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <div class="link-fallback">${resetLink}</div>
        </div>
        
        <div class="footer">
            <p>This email was sent from Restaurant Management System</p>
            <p>If you have any questions, please contact our support team.</p>
        </div>
    </div>
</body>
</html>`;

  const textTemplate = `
Password Reset Request - Restaurant Management

Hello,

We received a request to reset the password for your ${userTypeLabel} account (${email}).

To reset your password, please click the following link:
${resetLink}

Security Information:
- This link will expire in 1 hour
- The link can only be used once
- If you didn't request this reset, please ignore this email

If you have any questions, please contact our support team.

---
Restaurant Management System
`;

  return {
    html: htmlTemplate,
    text: textTemplate,
    subject: `Password Reset Request - ${userTypeLabel} Account`
  };
}
