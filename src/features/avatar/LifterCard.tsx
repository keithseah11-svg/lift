import { Link } from 'react-router'
import { useGame } from '../../db/game'
import { KG_PER_COIN } from '../../domain/game/catalog'
import { Avatar } from '../../components/avatar/Avatar'
import { ProgressBar } from '../../components/ProgressBar'

/** Home screen card: your avatar, coin balance and progress to the next coin. */
export function LifterCard() {
  const game = useGame()
  if (!game) return null
  const { ledger, look, unlocked } = game
  return (
    <Link to="/avatar" className="card flex items-center gap-4 p-3">
      <Avatar look={look} size={84} className="shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-baseline justify-between">
          <span className="font-bold">Your lifter</span>
          <span className="text-lg font-bold">🪙 {Math.max(0, ledger.balance)}</span>
        </div>
        <ProgressBar value={KG_PER_COIN - ledger.kgToNextCoin} max={KG_PER_COIN} tone="warn" />
        <div className="flex justify-between text-xs text-muted">
          <span>{ledger.kgToNextCoin.toLocaleString()} kg to next coin</span>
          <span>🏆 {unlocked.size}</span>
        </div>
        <div className="text-xs font-semibold text-accent">Shop & dress up ›</div>
      </div>
    </Link>
  )
}
