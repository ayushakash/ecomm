import Toast from 'react-native-toast-message';

/**
 * App-wide toast API (react-hot-toast equivalent). Rendered by <AppToast /> in App.tsx.
 * `title` is the main line; `message` an optional second line.
 */
export const toast = {
  success: (title: string, message?: string) =>
    Toast.show({ type: 'success', text1: title, text2: message }),
  error: (title: string, message?: string) =>
    Toast.show({ type: 'error', text1: title, text2: message, visibilityTime: 4500 }),
  info: (title: string, message?: string, durationMs = 4000) =>
    Toast.show({ type: 'info', text1: title, text2: message, visibilityTime: durationMs }),
  hide: () => Toast.hide(),
};
