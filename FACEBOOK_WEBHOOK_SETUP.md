# Facebook Webhook Setup Guide

This guide will help you set up the Facebook Messenger webhook to automatically create leads in your CRM when customers message your Facebook page.

## Prerequisites

1. A Facebook Page connected to your Meta Business account
2. A Meta App with Messenger product enabled
3. Your app deployed and accessible via HTTPS (required for webhooks)

## Environment Variables

Add these to your `.env` file:

```bash
# Supabase (should already exist)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Facebook Webhook Verification Token (create a random secure string)
META_VERIFY_TOKEN=your_random_secure_token_here
```

## Step 1: Get Your Webhook URL

Your webhook endpoint will be:
```
https://your-domain.com/api/webhooks/facebook
```

For local development with ngrok:
```
https://your-ngrok-url.ngrok.io/api/webhooks/facebook
```

## Step 2: Configure Facebook Webhook

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Select your App
3. Go to **Messenger** → **Settings** → **Webhooks**
4. Click **Add Callback URL**
5. Enter your webhook URL: `https://your-domain.com/api/webhooks/facebook`
6. Enter your Verify Token (same as `META_VERIFY_TOKEN` in your .env)
7. Subscribe to these webhook fields:
   - `messages`
   - `messaging_postbacks` (optional)
   - `messaging_optins` (optional)

## Step 3: Subscribe Your Page

1. In the same Webhooks section, find your Page
2. Click **Subscribe** to subscribe your page to the webhook

## Step 4: Test the Webhook

1. Send a test message to your Facebook Page
2. Check your server logs for "EVENT_RECEIVED"
3. Check your CRM - a new lead should appear!

## How It Works

1. **New Message Received**: When someone messages your Facebook page, Facebook sends a webhook event to your endpoint
2. **Lead Lookup**: The system checks if a lead with that sender ID already exists (stored in the `phone` field)
3. **Create or Update**:
   - **New Lead**: Creates a new lead with source "facebook_business" and assigns it to the first admin user
   - **Existing Lead**: Updates the lead's last message and changes status to "contacted"
4. **Save Message**: The message is saved to `crm_messages` table with sender='lead'

## Lead Assignment

Currently, new leads are assigned to:
1. The first admin user found in your system
2. If no admin exists, the first user who has any leads
3. If no users exist, the webhook will log an error

**For Production**: Consider implementing round-robin assignment or a dedicated assignment system.

## Troubleshooting

### Webhook Verification Fails
- Check that `META_VERIFY_TOKEN` matches exactly in both your .env and Facebook settings
- Ensure your webhook URL is accessible via HTTPS
- Check server logs for errors

### Messages Not Appearing
- Verify the webhook is subscribed to your page
- Check that `messages` field is subscribed in webhook settings
- Check server logs for errors
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set correctly

### Leads Not Created
- Check Supabase logs for database errors
- Verify RLS policies allow service role to insert
- Check that at least one user exists in your system

## Security Notes

- The webhook uses the service role key to bypass RLS (required since Facebook isn't a logged-in user)
- The verify token prevents unauthorized webhook calls
- Always use HTTPS in production
- Consider adding IP whitelisting for Facebook's IP ranges (optional)

## Facebook IP Ranges

If you want to add IP whitelisting, Facebook's webhook IPs are:
- See: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#ip-whitelist




