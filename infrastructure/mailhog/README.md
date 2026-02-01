# Mailhog - Email Testing Service

## Overview
Mailhog is an email testing tool for developers. It catches all emails sent to it and displays them in a web interface.

## Ports
- **1025**: SMTP server (accepts emails)
- **8025**: Web UI (view sent emails)

## Quick Start

### 1. Start Mailhog
```bash
docker-compose up mailhog
```

### 2. Access Web UI
- **URL**: http://localhost:8025
- Shows all emails sent to Mailhog

## Configuration

### Environment Variables
```bash
MH_SMTP_BIND_ADDR=0.0.0.0:1025
MH_UI_BIND_ADDR=0.0.0.0:8025
```

## Using in Applications

### Node.js (Nodemailer)
```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'mailhog',
  port: 1025,
  secure: false,
  ignoreTLS: true
});

await transporter.sendMail({
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Test Email',
  text: 'This is a test email'
});
```

### Python (smtplib)
```python
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

msg = MIMEMultipart()
msg['From'] = 'sender@example.com'
msg['To'] = 'recipient@example.com'
msg['Subject'] = 'Test Email'

msg.attach(MIMEText('This is a test email', 'plain'))

server = smtplib.SMTP('mailhog', 1025)
server.send_message(msg)
server.quit()
```

### Environment Configuration
Set in your `.env` file:
```
MAIL_HOST=mailhog
MAIL_PORT=1025
MAIL_FROM=noreply@tulifo.com
```

## Features

### Web Interface
- View all sent emails
- Search emails by recipient
- View HTML and plain text versions
- Download emails as EML

### API Endpoints
```bash
# Get all messages
curl http://localhost:8025/api/v1/messages

# Get specific message
curl http://localhost:8025/api/v1/messages/{id}

# Delete all messages
curl -X DELETE http://localhost:8025/api/v1/messages
```

## Use Cases

1. **Development**: Test email functionality without sending real emails
2. **Testing**: Automated email testing in CI/CD pipelines
3. **Staging**: Verify emails before production deployment
4. **Demo**: Show email functionality to stakeholders

## Testing Workflows

### Automated Email Testing
```bash
# Send test email
curl -X POST http://localhost:8025/api/v1/test \
  -d '{"to":"test@example.com","subject":"Test"}'

# Verify it was received
curl http://localhost:8025/api/v1/messages | jq '.items[0]'
```

## Persistence

By default, Mailhog stores emails in memory. They're lost when the container restarts.

To persist emails, mount a volume:
```yaml
mailhog:
  volumes:
    - mailhog_data:/home/mailhog
```

## Performance

- **Unlimited emails**: Can handle thousands of test emails
- **Fast search**: Quickly find emails by criteria
- **Low overhead**: Minimal resource usage

## Troubleshooting

### Emails not appearing
1. Verify SMTP connection: `telnet mailhog 1025`
2. Check logs: `docker logs mailhog`
3. Ensure application uses correct host/port

### Web UI not loading
1. Check port is available: `lsof -i :8025`
2. Restart service: `docker restart mailhog`

## Production Notes

⚠️ **DO NOT USE IN PRODUCTION**

Mailhog is designed for development/testing only. For production email:
- Use SendGrid, AWS SES, Mailgun, etc.
- Set up proper email authentication (SPF, DKIM, DMARC)
- Configure rate limiting and bounce handling

## Related Services

- **Notification Service**: Sends emails through Mailhog in development
- **Logstash**: Can capture email logs
- **Elasticsearch/Kibana**: Search and analyze email patterns

## Documentation
- Mailhog: https://github.com/mailhog/MailHog
- Nodemailer: https://nodemailer.com/
