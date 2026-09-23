import { Modal, Pressable, ScrollView, View } from 'react-native'
import { useRouter, usePathname, type Href } from 'expo-router'
import { Award, ChevronRight, LogOut, MapPin, Star } from 'lucide-react-native'
import { Separator, Text, YStack, XStack } from 'tamagui'
import { Avatar } from '@/components/Avatar'
import { drawerGroups, type NavItem } from '@/lib/nav'
import { useMenu } from '@/lib/menu'
import { useSessionProfile } from '@/lib/data'
import { useAuth } from '@/lib/auth'
import { fonts } from '@/lib/fonts'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors, toColor, withAlpha } from '@/lib/theme'
import { canAddTerrains } from '@/lib/types'
import { computePlayerBadge } from '@/lib/player-badge'

function initials(name?: string | null) {
  if (!name) return 'FU'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'FU'
}

function MenuRow({
  item,
  active,
  onPress,
  danger,
  palette,
}: {
  item: Pick<NavItem, 'label' | 'icon'>
  active?: boolean
  danger?: boolean
  onPress: () => void
  palette: typeof colors | typeof lightColors
}) {
  const Icon = item.icon
  const tint = danger ? palette.danger : active ? palette.primary : palette.text

  return (
    <Pressable onPress={onPress}>
      <XStack
        backgroundColor={active ? `${palette.primary}22` : palette.card}
        borderRadius={16}
        paddingHorizontal={16}
        paddingVertical={12}
        alignItems="center"
        justifyContent="space-between"
        marginBottom={8}
        borderWidth={active ? 1 : 0}
        borderColor={active ? palette.primary : 'transparent'}
      >
        <XStack alignItems="center" gap={14} flex={1} paddingRight={8}>
          <Icon size={20} color={tint} />
          <Text fontSize={15} numberOfLines={1} color={tint} style={{ ...fonts.semibold }}>
            {item.label}
          </Text>
        </XStack>
        <ChevronRight size={18} color={palette.textMuted} />
      </XStack>
    </Pressable>
  )
}

export function AppDrawer() {
  const { open, setOpen } = useMenu()
  const router = useRouter()
  const pathname = usePathname()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const { profile: sessionProfile } = useSessionProfile()
  const { signOut, session, profile: authProfile } = useAuth()
  const profile = authProfile || sessionProfile
  const displayName = profile?.full_name || profile?.first_name || 'Joueur FUTTO'
  const pseudo = profile?.pseudo ? `@${profile.pseudo}` : null
  const city = profile?.city || 'Abidjan'
  const position = profile?.position || 'Joueur'
  const avatarUrl = profile?.avatar_url
  const ratingNumber =
    profile?.rating != null &&
    Number(profile.rating) > 0 &&
    Number(profile.rating) !== 3.0 &&
    Number(profile.rating) !== 3
      ? Number(profile.rating)
      : null
  const badge = computePlayerBadge({
    playedCount: 0,
    rating: ratingNumber,
    skillLevel: profile?.skill_level,
  })

  const go = (href: string) => {
    setOpen(false)
    if (href === '/') router.push('/(tabs)' as Href)
    else if (href === '/matchs') router.push('/(tabs)/matchs' as Href)
    else if (href === '/tournois') router.push('/(tabs)/tournois' as Href)
    else if (href === '/feed') router.push('/(tabs)/feed' as Href)
    else if (href === '/profil') router.push('/(tabs)/profil' as Href)
    else if (href === '/terrains' || href === '/reserver') router.push('/reserver' as Href)
    else if (href === '/carte') router.push('/carte' as Href)
    else router.push(href as Href)
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/' || pathname === '/index'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <Pressable
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
          }}
          onPress={() => setOpen(false)}
          accessibilityLabel="Fermer le menu"
        />
        <View
          style={{
            width: '88%',
            maxWidth: 320,
            height: '100%',
            backgroundColor: palette.bg,
            paddingTop: 48,
          }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
          >
            {/* Carte Profil Joueur modernisée */}
            <Pressable
              onPress={() => go('/profil')}
              style={({ pressed }) => ({
                opacity: pressed ? 0.88 : 1,
                marginBottom: 16,
              })}
            >
              <YStack
                backgroundColor={mode === 'dark' ? 'rgba(255,255,255,0.04)' : palette.card}
                borderRadius={20}
                padding={14}
                borderWidth={1}
                borderColor={mode === 'dark' ? 'rgba(255,255,255,0.08)' : `${palette.primary}25`}
                gap={12}
              >
                {/* Ligne 1: Avatar + Infos principales + Chevron */}
                <XStack alignItems="center" gap={12}>
                  <View
                    style={{
                      borderRadius: 32,
                      padding: 2,
                      borderWidth: 2,
                      borderColor: palette.primary,
                    }}
                  >
                    <Avatar
                      uri={avatarUrl}
                      initials={initials(displayName)}
                      color={palette.primary}
                      size={52}
                    />
                  </View>

                  <YStack flex={1} minWidth={0} gap={2}>
                    <Text
                      color={palette.text}
                      fontSize={16}
                      numberOfLines={1}
                      style={{ ...fonts.bold }}
                    >
                      {displayName}
                    </Text>

                    {pseudo ? (
                      <Text
                        color={palette.primary}
                        fontSize={13}
                        numberOfLines={1}
                        style={{ ...fonts.semibold }}
                      >
                        {pseudo}
                      </Text>
                    ) : null}

                    <XStack alignItems="center" gap={4} marginTop={1}>
                      <MapPin size={11} color={palette.textMuted} />
                      <Text
                        color={palette.textMuted}
                        fontSize={11}
                        numberOfLines={1}
                        style={{ ...fonts.regular }}
                      >
                        {city}
                      </Text>
                      <Text color={palette.textMuted} fontSize={10}>
                        •
                      </Text>
                      <Text
                        color={palette.accent}
                        fontSize={11}
                        numberOfLines={1}
                        style={{ ...fonts.medium }}
                      >
                        {position}
                      </Text>
                    </XStack>
                  </YStack>

                  <ChevronRight size={18} color={palette.textMuted} />
                </XStack>

                {/* Ligne 2: Badges & Note */}
                <XStack
                  alignItems="center"
                  justifyContent="space-between"
                  paddingTop={10}
                  borderTopWidth={1}
                  borderTopColor={mode === 'dark' ? 'rgba(255,255,255,0.06)' : palette.border}
                >
                  <XStack
                    alignItems="center"
                    gap={5}
                    paddingHorizontal={8}
                    paddingVertical={3}
                    borderRadius={999}
                    backgroundColor={toColor(badge.bgColor)}
                    borderWidth={1}
                    borderColor={withAlpha(badge.color, '33')}
                  >
                    <Award size={12} color={toColor(badge.color)} />
                    <Text
                      color={toColor(badge.color)}
                      fontSize={11}
                      style={{ ...fonts.bold }}
                    >
                      {badge.label}
                    </Text>
                  </XStack>

                  <XStack alignItems="center" gap={4}>
                    <Star size={12} color="#F59E0B" fill="#F59E0B" />
                    <Text
                      color={ratingNumber != null ? palette.text : palette.textMuted}
                      fontSize={11}
                      style={{ ...fonts.medium }}
                    >
                      {ratingNumber != null ? `${ratingNumber.toFixed(1)} / 5.0` : 'Note : Néant'}
                    </Text>
                  </XStack>
                </XStack>
              </YStack>
            </Pressable>

            {drawerGroups.map((group, gi) => (
              <YStack key={group.title}>
                {gi > 0 ? <Separator marginVertical={12} borderColor={palette.border} /> : null}
                <Text
                  color={palette.textMuted}
                  marginBottom={10}
                  marginLeft={4}
                  style={{
                    ...fonts.bold,
                    fontSize: 10,
                    letterSpacing: 0,
                    textTransform: 'uppercase',
                  }}
                >
                  {group.title}
                </Text>
                {group.items
                  .filter((item) => {
                    if (item.href === '/ajouter-terrain') {
                      return canAddTerrains(profile?.role)
                    }
                    return true
                  })
                  .map((item) => (
                  <MenuRow
                    key={item.href}
                    item={item}
                    active={isActive(item.href)}
                    onPress={() => go(item.href)}
                    palette={palette}
                  />
                ))}
              </YStack>
            ))}

            <Separator marginVertical={12} borderColor={palette.border} />

            <MenuRow
              item={{
                label: session ? 'Se déconnecter' : 'Se connecter',
                icon: LogOut,
              }}
              danger={!!session}
              onPress={() => {
                setOpen(false)
                if (session) {
                  void signOut().then(() => router.replace('/splash' as Href))
                } else {
                  router.push('/welcome' as Href)
                }
              }}
              palette={palette}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
