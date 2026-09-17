import AsyncStorage from '@react-native-async-storage/async-storage'

export const PENDING_PERMS_KEY = 'futto_pending_perms'
export const PERMS_DONE_KEY = 'futto_perms_done'

export async function markPermissionsPending() {
  await AsyncStorage.setItem(PENDING_PERMS_KEY, '1')
}

export async function clearPermissionsPending() {
  await AsyncStorage.multiRemove([PENDING_PERMS_KEY])
  await AsyncStorage.setItem(PERMS_DONE_KEY, '1')
}

export async function isPermissionsPending() {
  return (await AsyncStorage.getItem(PENDING_PERMS_KEY)) === '1'
}
