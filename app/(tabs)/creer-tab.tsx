import { Redirect } from 'expo-router'

/** Slot requis par Tabs — redirige si jamais affiché directement. */
export default function CreerTabSlot() {
  return <Redirect href="/(tabs)" />
}
