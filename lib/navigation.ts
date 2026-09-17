import { useRouter } from 'expo-router'

/** Avoid "Is there any screen to go back to?" when stack is empty. */
export function useSafeDismiss(fallback: string = '/') {
  const router = useRouter()
  return () => {
    if (router.canGoBack()) router.back()
    else router.replace(fallback as '/')
  }
}
