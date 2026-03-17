import { redirect } from 'next/navigation'

export default function LegacyLeaderboardRedirect() {
  redirect('/leaderboards')
}
