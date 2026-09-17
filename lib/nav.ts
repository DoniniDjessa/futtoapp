import type { ComponentType } from 'react'
import {
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardList,
  HelpCircle,
  Home,
  Info,
  MapPin,
  MessageSquare,
  Plus,
  Settings,
  Shield,
  Trophy,
  User,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react-native'

type IconProps = { color?: string; size?: number }

export type NavItem = {
  href: string
  label: string
  icon: ComponentType<IconProps>
}

export type NavGroup = {
  title: string
  items: NavItem[]
}

/** Nav V1 — tabs : Accueil · Matchs · + · Feed · Profil (peau démo) */
export const drawerGroups: NavGroup[] = [
  {
    title: 'Jouer',
    items: [
      { href: '/', label: 'Accueil', icon: Home },
      { href: '/reserver', label: 'Terrains', icon: MapPin },
      { href: '/carte', label: 'Carte', icon: MapPin },
      { href: '/mes-reservations', label: 'Mes demandes terrain', icon: ClipboardList },
      { href: '/matchs', label: 'Matchs', icon: CalendarDays },
      { href: '/creer', label: 'Créer un match', icon: Plus },
      { href: '/ajouter-terrain', label: 'Ajouter un terrain', icon: MapPin },
    ],
  },
  {
    title: 'Communauté',
    items: [
      { href: '/messages', label: 'Messages', icon: MessageSquare },
      { href: '/amis', label: 'Amis & Réseau', icon: UserCheck },
      { href: '/joueurs', label: 'Joueurs', icon: Users },
      { href: '/mon-equipe', label: 'Mon équipe', icon: Shield },
      { href: '/tournois', label: 'Tournois', icon: Trophy },
    ],
  },
  {
    title: 'Mon compte',
    items: [
      { href: '/notifications', label: 'Notifications', icon: Bell },
      { href: '/portefeuille', label: 'Portefeuille', icon: Wallet },
      { href: '/stats', label: 'Statistiques', icon: BarChart3 },
      { href: '/profil', label: 'Profil', icon: User },
      { href: '/parametres', label: 'Paramètres', icon: Settings },
      { href: '/aide', label: 'Aide', icon: HelpCircle },
      { href: '/a-propos', label: 'À propos', icon: Info },
    ],
  },
]
