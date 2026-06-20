import { Alert, AlertButton, Platform } from 'react-native';

/**
 * Cross-platform alert.
 *
 * React Native's `Alert.alert` is a no-op on react-native-web, which silently
 * breaks confirmations (e.g. the create-event date-conflict prompt) in the PWA.
 * This helper mirrors the `Alert.alert` signature but falls back to the
 * browser's native `window.alert` / `window.confirm` on web so the flows keep
 * working there.
 */
export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;

  // No buttons, or a single acknowledge button → simple alert.
  if (!buttons || buttons.length === 0) {
    window.alert(text);
    return;
  }
  if (buttons.length === 1) {
    window.alert(text);
    buttons[0]?.onPress?.();
    return;
  }

  // Multiple buttons → confirm. OK runs the primary (non-cancel) action,
  // Cancel runs the cancel-styled button (if any).
  const cancelBtn = buttons.find((b) => b.style === 'cancel');
  const confirmBtn =
    buttons.find((b) => b.style !== 'cancel') ?? buttons[buttons.length - 1];

  if (window.confirm(text)) {
    confirmBtn?.onPress?.();
  } else {
    cancelBtn?.onPress?.();
  }
}
