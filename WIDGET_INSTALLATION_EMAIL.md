# Widget Installation Email System

This document describes the complete widget installation email system that has been implemented for the WebAbility Widget.

## Overview

The system allows users to send beautiful, professional installation instructions via email when they configure their widget. The email includes:

- 📋 Complete installation code
- 📝 Step-by-step instructions
- 🎨 Beautiful, responsive design
- 📱 Mobile-friendly layout
- 🌐 Multi-language support

## Architecture

### Frontend Components

1. **CodeContainer.tsx** - Main component with "Send Instructions" button
2. **Email Modal** - Popup for email input with validation
3. **GraphQL Integration** - Uses Apollo Client for API calls

### Backend Services

1. **Email Template** - MJML-based responsive email template
2. **Email Service** - Integration with existing Brevo email service
3. **GraphQL Resolver** - Mutation for sending installation instructions
4. **REST API** - Alternative REST endpoint
5. **Validation** - Email format and required field validation

## Features

### ✅ Email Template Features

- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Professional Branding**: Matches WebAbility brand colors and design
- **Code Highlighting**: Installation code displayed in a code block
- **Configuration Summary**: Shows selected position and language
- **Step-by-Step Guide**: Clear 4-step installation process
- **Pro Tips**: Helpful hints for users
- **Support Contact**: Direct link to support team

### ✅ Frontend Features

- **Email Validation**: Real-time validation with error messages
- **Loading States**: Smooth animations during sending
- **Success Feedback**: Clear confirmation when email is sent
- **Error Handling**: Graceful error handling with user feedback
- **Responsive Modal**: Works on all screen sizes

### ✅ Backend Features

- **Rate Limiting**: Prevents abuse (5 requests per hour)
- **Authentication**: Requires user authentication
- **Validation**: Comprehensive input validation
- **Logging**: Detailed logging for debugging
- **Retry Logic**: Automatic retry on failure
- **Error Handling**: Proper error responses

## API Endpoints

### GraphQL Mutation

```graphql
mutation SendWidgetInstallationInstructions(
  $email: String!
  $code: String!
  $position: String!
  $language: String!
  $languageName: String!
) {
  sendWidgetInstallationInstructions(
    email: $email
    code: $code
    position: $position
    language: $language
    languageName: $languageName
  ) {
    success
    message
  }
}
```

### REST API Endpoint

```
POST /api/widget/send-installation-instructions
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "<script src=\"...\"></script>",
  "position": "bottom-right",
  "language": "en",
  "languageName": "English"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Installation instructions sent successfully"
}
```

## Email Template Structure

The email template (`widgetInstallation.mjml`) includes:

1. **Header Section**
   - WebAbility branding
   - Welcome message

2. **Installation Code Section**
   - Code block with syntax highlighting
   - Clear instructions

3. **Configuration Summary**
   - Position and language settings
   - Visual configuration cards

4. **Step-by-Step Instructions**
   - 4 numbered steps
   - Clear descriptions
   - Visual step indicators

5. **Pro Tips Section**
   - Helpful hints
   - Best practices

6. **Support Section**
   - Contact information
   - Call-to-action button

7. **Footer**
   - Brand message
   - Contact details

## Usage Examples

### Frontend Usage (GraphQL)

```typescript
import { useMutation, gql } from '@apollo/client';

const SEND_WIDGET_INSTALLATION = gql`
  mutation SendWidgetInstallationInstructions(
    $email: String!
    $code: String!
    $position: String!
    $language: String!
    $languageName: String!
  ) {
    sendWidgetInstallationInstructions(
      email: $email
      code: $code
      position: $position
      language: $language
      languageName: $languageName
    ) {
      success
      message
    }
  }
`;

const [sendWidgetInstallation, { loading }] = useMutation(SEND_WIDGET_INSTALLATION);

const handleSend = async () => {
  try {
    const result = await sendWidgetInstallation({
      variables: {
        email: 'user@example.com',
        code: '<script src="..."></script>',
        position: 'bottom-right',
        language: 'en',
        languageName: 'English'
      }
    });
    
    if (result.data?.sendWidgetInstallationInstructions?.success) {
      console.log('Email sent successfully!');
    }
  } catch (error) {
    console.error('Failed to send email:', error);
  }
};
```

### REST API Usage

```javascript
const response = await fetch('/api/widget/send-installation-instructions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    code: '<script src="..."></script>',
    position: 'bottom-right',
    language: 'en',
    languageName: 'English'
  })
});

const result = await response.json();
if (result.success) {
  console.log('Email sent successfully!');
}
```

## Configuration

### Environment Variables

The system uses the existing email configuration:

```env
BREVO_API_KEY=your_brevo_api_key
EMAIL_FROM=noreply@webability.io
```

### Rate Limiting

- **GraphQL**: 5 requests per hour per user
- **REST API**: Moderate rate limiting (configurable)

### Authentication

- **GraphQL**: Requires user authentication
- **REST API**: No authentication required (public endpoint)

## Error Handling

### Frontend Errors

- Invalid email format
- Network errors
- Server errors
- Rate limiting errors

### Backend Errors

- Missing required fields
- Invalid email format
- Email service errors
- Template compilation errors

## Monitoring and Logging

### Logs

The system logs:
- Successful email sends
- Failed email attempts
- Rate limit violations
- Template compilation errors

### Metrics

Track:
- Email send success rate
- Popular widget configurations
- User engagement with emails

## Security Considerations

1. **Rate Limiting**: Prevents abuse and spam
2. **Input Validation**: Sanitizes all inputs
3. **Email Validation**: Ensures valid email format
4. **Authentication**: Protects against unauthorized access
5. **Logging**: Tracks usage for security monitoring

## Future Enhancements

1. **Email Templates**: Add more language-specific templates
2. **Analytics**: Track email open rates and click-through rates
3. **Customization**: Allow users to customize email content
4. **Scheduling**: Allow scheduled email sending
5. **Templates**: Add more email template variations

## Troubleshooting

### Common Issues

1. **Email not received**
   - Check spam folder
   - Verify email address
   - Check email service status

2. **Template not rendering**
   - Check MJML compilation
   - Verify template variables
   - Check email client compatibility

3. **Rate limiting**
   - Wait for rate limit to reset
   - Check user authentication
   - Verify request frequency

### Debug Mode

Enable debug logging:
```env
DEBUG=email:*
```

## Support

For issues with the widget installation email system:

1. Check the logs for error messages
2. Verify email service configuration
3. Test with a simple email template
4. Contact the development team

---

**Last Updated**: December 2024
**Version**: 1.0.0 