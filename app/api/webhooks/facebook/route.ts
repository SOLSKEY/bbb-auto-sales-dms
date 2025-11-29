import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with Service Role Key to bypass RLS
// (Because Facebook servers are not a logged-in user)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(
  supabaseUrl!,
  supabaseServiceKey!
);

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

// 1. GET Request: Used by Facebook to verify your webhook URL
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      return new NextResponse(challenge, { status: 200 });
    } else {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }
  return new NextResponse('Bad Request', { status: 400 });
}

// 2. POST Request: Used by Facebook to send you messages
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Check if this is a page event
    if (body.object === 'page' || body.object === 'instagram') {
      // Iterate over each entry (there might be multiple if batched)
      for (const entry of body.entry) {
        // 1. Handle Messenger/Instagram Messaging Events
        if (entry.messaging) {
          const webhookEvent = entry.messaging[0];
          await handleMessageEvent(webhookEvent, 'facebook_business');
        }

        // 2. Handle Instagram messaging events
        if (entry.messaging && body.object === 'instagram') {
          const webhookEvent = entry.messaging[0];
          await handleMessageEvent(webhookEvent, 'facebook_business');
        }
      }
      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    } else {
      return new NextResponse('Not Found', { status: 404 });
    }
  } catch (error) {
    console.error('Webhook Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function handleMessageEvent(event: any, source: string) {
  const senderId = event.sender.id;
  const messageText = event.message?.text;

  if (!messageText) return; // Ignore attachments/stickers for this v1

  // A. Try to find an existing lead with this Sender ID
  // Note: We are temporarily storing the Platform ID (senderId) in the 'phone' column
  // or you could add a 'platform_id' column to your DB for cleaner data.
  // Here we assume 'phone' holds the unique ID for digital leads.
  const { data: existingLeads } = await supabase
    .from('crm_leads')
    .select('*')
    .eq('phone', senderId)
    .limit(1);

  let leadId;

  if (existingLeads && existingLeads.length > 0) {
    // B. Lead exists, update them
    leadId = existingLeads[0].id;
    await supabase
      .from('crm_leads')
      .update({
        last_message: messageText,
        status: 'contacted', // Bump status if they reply
        sentiment: 'neutral', // Reset sentiment on new msg (optional)
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);
  } else {
    // C. New Lead! Create them.
    // Since we don't know the user, we assign this to the first admin found
    // OR you can set a specific 'default_user_id' in your env variables.

    // Get the first admin user to assign the lead to
    // In production, you'd want round-robin assignment or a dedicated assignment system
    let fallbackUserId: string | null = null;
    
    // Try to get an admin user from auth
    try {
      const { data: adminUsers, error: adminError } = await supabase.auth.admin.listUsers();
      
      if (!adminError && adminUsers && adminUsers.users.length > 0) {
        // Find first admin user
        const adminUser = adminUsers.users.find(
          (u) => u.user_metadata?.role === 'admin'
        );
        fallbackUserId = adminUser?.id || adminUsers.users[0].id;
      }
    } catch (error) {
      console.warn('Could not fetch admin users, trying fallback:', error);
    }
    
    // Fallback: try to get any user from crm_leads
    if (!fallbackUserId) {
      const { data: userData } = await supabase
        .from('crm_leads')
        .select('user_id')
        .limit(1);
      fallbackUserId = userData?.[0]?.user_id || null;
    }

    if (!fallbackUserId) {
      console.error('No users found to assign lead to.');
      return;
    }

    const { data: newLead, error: insertError } = await supabase
      .from('crm_leads')
      .insert({
        user_id: fallbackUserId,
        source: source,
        name: `New Lead ${senderId.substring(0, 4)}`, // Placeholder name
        phone: senderId, // Storing ID here for matching later
        last_message: messageText,
        status: 'new',
        vehicle: null, // Your schema uses 'vehicle' not 'vehicle_of_interest'
        sentiment: 'neutral',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating new lead:', insertError);
      return;
    }

    if (newLead) leadId = newLead.id;
  }

  // D. Insert the Message
  if (leadId) {
    await supabase.from('crm_messages').insert({
      lead_id: leadId,
      sender: 'lead',
      content: messageText,
    });
  }
}

