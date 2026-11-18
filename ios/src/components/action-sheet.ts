import { ActionSheetIOS, Alert, Platform, type AlertButton } from 'react-native';

export function showActions(title: string, message: string | undefined, actions: AlertButton[]) {
  if (Platform.OS !== 'ios') {
    Alert.alert(title, message, actions);
    return;
  }

  const cancelButtonIndex = actions.findIndex((action) => action.style === 'cancel');
  const destructiveButtonIndex = actions.findIndex((action) => action.style === 'destructive');
  ActionSheetIOS.showActionSheetWithOptions({
    title,
    message,
    options: actions.map((action) => action.text ?? ''),
    ...(cancelButtonIndex >= 0 && { cancelButtonIndex }),
    ...(destructiveButtonIndex >= 0 && { destructiveButtonIndex }),
  }, (index) => actions[index]?.onPress?.());
}
