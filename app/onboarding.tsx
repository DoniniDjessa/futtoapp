import { Redirect } from 'expo-router'

/** Ancien écran — redirige vers welcome animé. */
export default function OnboardingScreen() {
  return <Redirect href="/welcome" />
}
