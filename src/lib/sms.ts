import { getSystemSetting } from '@/app/actions/settings';
import { createServiceRoleSupabaseClient } from '@/lib/supabase';

/**
 * Normalizes a phone number to standard international format for Ghana (e.g., 233...)
 */
function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    return `233${cleaned.substring(1)}`;
  }
  if (!cleaned.startsWith('233')) {
    // If it's 9 digits without the 0, just append 233
    if (cleaned.length === 9) {
      return `233${cleaned}`;
    }
  }
  return cleaned;
}

/**
 * Sends an SMS using the Arkesel V2 API.
 * Modify this function if you switch to a different provider (like Hubtel or Twilio).
 */
export async function sendSMS(to: string, message: string, customerId?: string): Promise<boolean> {
  const supabase = createServiceRoleSupabaseClient();
  let status = 'failed';
  let providerResponse: any = null;

  try {
    const apiKey = await getSystemSetting('sms_api_key');
    const senderId = await getSystemSetting('sms_sender_id') || 'CREDIFON';

    if (!apiKey) {
      console.warn('SMS API Key is not configured. Skipping SMS sending.');
      return false;
    }

    const recipient = normalizePhoneNumber(to);

    const response = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: senderId,
        message: message,
        recipients: [recipient]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send SMS:', errorText);
      providerResponse = { error: errorText };
    } else {
      const data = await response.json();
      status = 'sent';
      providerResponse = data;
    }

    // Log the SMS
    await supabase.from('sms_logs').insert({
      recipient_phone: recipient,
      customer_id: customerId || null,
      message_content: message,
      status: status,
      provider_response: providerResponse
    });

    return status === 'sent';
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    await supabase.from('sms_logs').insert({
      recipient_phone: to,
      customer_id: customerId || null,
      message_content: message,
      status: 'failed',
      provider_response: { error: error.message }
    });
    return false;
  }
}

/**
 * Sends a triggered SMS using a template from automated_triggers.
 */
export async function sendTriggerSMS(
  eventKey: string,
  to: string,
  variables: Record<string, string>,
  customerId?: string
): Promise<boolean> {
  const supabase = createServiceRoleSupabaseClient();
  
  const { data: trigger } = await supabase
    .from('automated_triggers')
    .select('message_template, is_active')
    .eq('event_key', eventKey)
    .single();

  if (!trigger || !trigger.is_active) {
    console.log(`Trigger ${eventKey} is inactive or not found. Skipping SMS.`);
    return false;
  }

  let message = trigger.message_template;
  for (const [key, value] of Object.entries(variables)) {
    message = message.replace(new RegExp(`{${key}}`, 'g'), value);
  }

  return sendSMS(to, message, customerId);
}
