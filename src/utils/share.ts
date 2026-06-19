import { Linking, Platform } from 'react-native';

/**
 * Open WhatsApp with a pre-filled message (the user picks the recipient).
 * Tickets are stored as URLs, so we share the link as text — the recipient
 * taps it to view/download the PDF.
 */
export async function shareViaWhatsApp(message: string) {
  const encoded = encodeURIComponent(message);
  const webUrl = `https://api.whatsapp.com/send?text=${encoded}`;

  if (Platform.OS === 'web') {
    window.open(webUrl, '_blank');
    return;
  }

  const appUrl = `whatsapp://send?text=${encoded}`;
  try {
    const canOpen = await Linking.canOpenURL(appUrl);
    await Linking.openURL(canOpen ? appUrl : webUrl);
  } catch {
    await Linking.openURL(webUrl);
  }
}

/** Build a friendly ticket-share message. */
export function ticketMessage(label: string, url: string, eventTitle?: string) {
  const lines = [eventTitle ? `✈️ ${eventTitle}` : '✈️ Flight ticket', label, url];
  return lines.filter(Boolean).join('\n');
}
