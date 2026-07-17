import { getSystemSetting } from '@/app/actions/settings';

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
export async function sendSMS(to: string, message: string): Promise<boolean> {
  try {
    const apiKey = await getSystemSetting('sms_api_key');
    const senderId = await getSystemSetting('sms_sender_id') || 'NEXORA';

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
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
}
