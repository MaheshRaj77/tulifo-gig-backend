# Mailhog - Email Testing & Development

## Overview

Mailhog is a mail testing tool for developers. It catches emails sent to localhost and displays them in a web interface. Perfect for testing email functionality without sending real emails.

## Access

- **Web UI**: http://localhost:8025
- **SMTP Server**: localhost:1025

## Features

- ✅ Capture all emails sent to localhost
- ✅ Web interface to view emails
- ✅ Search and filter emails
- ✅ View email source, HTML, plain text
- ✅ No configuration needed
- ✅ Lightweight and fast
- ✅ Release/replay emails

## Integration with Microservices

### Node.js Integration (Nodemailer)

```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'mailhog',
  port: 1025,
  secure: false,
  ignoreTLS: true
});

async function sendEmail(to, subject, text) {
  try {
    const info = await transporter.sendMail({
      from: 'noreply@tulifo.com',
      to: to,
      subject: subject,
      text: text,
      html: `<b>${text}</b>`
    });
    console.log('Email sent:', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// Usage
sendEmail('user@example.com', 'Welcome', 'Welcome to Tulifo!');
```

### Python Integration (Flask-Mail)

```python
from flask_mail import Mail, Message

mail = Mail(app)
app.config['MAIL_SERVER'] = 'mailhog'
app.config['MAIL_PORT'] = 1025
app.config['MAIL_USE_TLS'] = False

msg = Message('Welcome', recipients=['user@example.com'])
msg.body = 'Welcome to Tulifo!'
msg.html = '<b>Welcome to Tulifo!</b>'
mail.send(msg)
```

### Generic SMTP

```bash
# Send test email using telnet
telnet mailhog 1025

# Commands:
MAIL FROM: <sender@example.com>
RCPT TO: <recipient@example.com>
DATA
Subject: Test Email

This is a test email.
.
QUIT
```

## Services Configuration

### Notification Service

```javascript
// src/routes/email.routes.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'mailhog',
  port: process.env.MAIL_PORT || 1025,
  secure: process.env.MAIL_SECURE === 'true',
  auth: process.env.MAIL_USER && {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD
  }
});

async function sendNotificationEmail(email, type, data) {
  const templates = {
    'booking-request': {
      subject: 'New Booking Request',
      html: `<p>You have a new booking request from ${data.clientName}</p>`
    },
    'payment-confirmed': {
      subject: 'Payment Confirmed',
      html: `<p>Your payment of $${data.amount} has been confirmed</p>`
    },
    'project-update': {
      subject: 'Project Update',
      html: `<p>Project ${data.projectName} has been updated</p>`
    }
  };

  const template = templates[type];
  
  return transporter.sendMail({
    from: process.env.MAIL_FROM || 'noreply@tulifo.com',
    to: email,
    subject: template.subject,
    html: template.html
  });
}

export default sendNotificationEmail;
```

### User Service (Email Verification)

```javascript
async function sendVerificationEmail(email, token) {
  const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;
  
  return transporter.sendMail({
    from: 'noreply@tulifo.com',
    to: email,
    subject: 'Verify Your Email',
    html: `
      <h1>Verify Your Email</h1>
      <p>Click the link below to verify your email address:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
      <p>This link expires in 24 hours.</p>
    `
  });
}
```

### Auth Service (Password Reset)

```javascript
async function sendPasswordResetEmail(email, resetToken) {
  const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
  
  return transporter.sendMail({
    from: 'noreply@tulifo.com',
    to: email,
    subject: 'Reset Your Password',
    html: `
      <h1>Password Reset Request</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>If you didn't request this, please ignore this email.</p>
      <p>This link expires in 1 hour.</p>
    `
  });
}
```

## Environment Variables

Add to `.env`:

```env
# Email Configuration
MAIL_HOST=mailhog
MAIL_PORT=1025
MAIL_SECURE=false
MAIL_USER=
MAIL_PASSWORD=
MAIL_FROM=noreply@tulifo.com
```

For production, update to your mail provider:

```env
# Production (SendGrid)
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=apikey
MAIL_PASSWORD=SG.xxxxxxxxxxxx
```

## Email Templates

Create reusable email templates:

```javascript
// lib/email-templates.js
export const emailTemplates = {
  welcome: (name) => ({
    subject: `Welcome to Tulifo, ${name}!`,
    html: `
      <h1>Welcome to Tulifo</h1>
      <p>Hi ${name},</p>
      <p>We're excited to have you on the platform.</p>
      <a href="${process.env.APP_URL}">Get Started</a>
    `
  }),
  
  bookingRequest: (worker, client, project) => ({
    subject: `New Booking Request from ${client.name}`,
    html: `
      <h1>New Booking Request</h1>
      <p>Hi ${worker.name},</p>
      <p>${client.name} is interested in your services for project "${project.title}"</p>
      <p>Budget: $${project.budget}</p>
      <a href="${process.env.APP_URL}/bookings">View Request</a>
    `
  }),
  
  paymentConfirmed: (user, amount, description) => ({
    subject: 'Payment Confirmed',
    html: `
      <h1>Payment Confirmed</h1>
      <p>Hi ${user.name},</p>
      <p>Your payment of <strong>$${amount}</strong> for ${description} has been confirmed.</p>
      <p>Transaction ID: ${generateTransactionId()}</p>
    `
  })
};
```

## Testing Workflow

1. **Run Mailhog**:
   ```bash
   docker-compose up mailhog
   ```

2. **Send Email from Service**:
   ```bash
   curl -X POST http://localhost:3005/send-email \
     -H "Content-Type: application/json" \
     -d '{
       "to": "test@example.com",
       "subject": "Test",
       "html": "<p>Test email</p>"
     }'
   ```

3. **View in Web UI**:
   - Go to http://localhost:8025
   - Email appears instantly
   - Click to view full email

4. **Release/Replay**:
   - Click email
   - "Release" to send to real SMTP server (production)
   - "Replay" to resend through Mailhog

## API Reference

### Get All Messages

```bash
curl http://localhost:8025/api/v1/messages
```

### Get Message Details

```bash
curl http://localhost:8025/api/v1/messages/1
```

### Delete All Messages

```bash
curl -X DELETE http://localhost:8025/api/v1/messages
```

### Release Message

```bash
curl -X POST http://localhost:8025/api/v1/messages/1/release
```

## Production Setup

For production, use services like:
- **SendGrid**: SMTP at smtp.sendgrid.net
- **AWS SES**: SMTP at email-smtp.{region}.amazonaws.com
- **Mailgun**: SMTP at smtp.mailgun.org
- **Postmark**: SMTP at smtp.postmarkapp.com

Update `.env` for each environment:

```env
# .env.development
MAIL_HOST=mailhog
MAIL_PORT=1025

# .env.production
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USER=apikey
MAIL_PASSWORD=${SENDGRID_API_KEY}
```

## Troubleshooting

### Mailhog not receiving emails

```bash
# Check if service is running
docker ps | grep mailhog

# Check logs
docker logs $(docker ps -q -f "name=mailhog")

# Verify connection
telnet localhost 1025
```

### Environment not set

```bash
# Verify variables in running container
docker exec notification-service env | grep MAIL
```

## Documentation

- Mailhog GitHub: https://github.com/mailhog/MailHog
- Nodemailer: https://nodemailer.com/
- Flask-Mail: https://flask-mail.readthedocs.io/
