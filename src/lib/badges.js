import { Award, BookMarked, BookOpen, Crown, Flame, Gem, Medal, Rocket, Sparkles, Star, Target, Trophy } from 'lucide-react'

export const STREAK_BADGES = [
  { days: 3, name: 'Spark', icon: Sparkles },
  { days: 7, name: 'Week Warrior', icon: Flame },
  { days: 14, name: 'Fortnight Flame', icon: Rocket },
  { days: 30, name: 'Monthly Master', icon: Medal },
  { days: 60, name: 'Unstoppable', icon: Gem },
  { days: 100, name: 'Century Club', icon: Crown },
  { days: 365, name: 'Year of Stories', icon: Trophy },
]

export const BOOK_BADGES = [
  { books: 1, name: 'First Finish', icon: BookMarked },
  { books: 5, name: 'Bookworm', icon: Award },
  { books: 10, name: 'Shelf Star', icon: Star },
  { books: 25, name: 'Story Master', icon: Trophy },
]

export const PAGE_BADGES = [
  { pages: 100, name: 'Page Turner', icon: BookOpen },
  { pages: 500, name: 'Page Hero', icon: Target },
  { pages: 1000, name: 'Page Legend', icon: Gem },
]

export const badgeForStreak = (n) => STREAK_BADGES.find((b) => b.days === n) || null
export const badgeForBooks = (n) => BOOK_BADGES.find((b) => b.books === n) || null