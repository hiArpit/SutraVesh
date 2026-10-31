import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'

interface BubbleData extends Record<string, unknown> {
  label: string
  category: string
  description: string
}

type BubbleNodeType = Node<BubbleData>

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  biology:    { bg: 'bg-emerald-500', border: 'border-emerald-300', text: 'text-white', glow: 'shadow-emerald-500/30' },
  astronomy:  { bg: 'bg-indigo-600',  border: 'border-indigo-300',  text: 'text-white', glow: 'shadow-indigo-500/30' },
  physics:    { bg: 'bg-amber-500',   border: 'border-amber-300',   text: 'text-white', glow: 'shadow-amber-500/30' },
  chemistry:  { bg: 'bg-cyan-500',    border: 'border-cyan-300',    text: 'text-white', glow: 'shadow-cyan-500/30' },
  technology: { bg: 'bg-rose-500',    border: 'border-rose-300',    text: 'text-white', glow: 'shadow-rose-500/30' },
  general:    { bg: 'bg-orange-500',  border: 'border-orange-300',  text: 'text-white', glow: 'shadow-orange-500/30' },
}

export default memo(function BubbleNode({ data }: NodeProps<BubbleNodeType>) {
  const theme = CATEGORY_COLORS[data.category] ?? CATEGORY_COLORS.general

  return (
    <div
      className={`node-bubble relative flex flex-col items-center justify-center
        w-28 h-28 rounded-full border-4 ${theme.bg} ${theme.border}
        cursor-pointer select-none shadow-xl ${theme.glow} transition-transform hover:scale-110 group`}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />

      <span className="text-2xl mb-0.5 filter drop-shadow">
        {categoryEmoji(data.category)}
      </span>

      <p className="text-xs font-black text-center text-white leading-tight px-2 truncate w-full text-center tracking-tight">
        {data.label}
      </p>

      {data.description && (
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-52
          bg-white text-slate-800 border-2 border-orange-200 text-xs rounded-2xl p-3
          opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-2xl
          transition-opacity duration-200">
          <p className="font-bold text-orange-600 text-[11px] mb-1 capitalize">🌿 {data.category}</p>
          <p className="text-slate-600 text-[11px] leading-relaxed">{data.description.slice(0, 110)}…</p>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  )
})

function categoryEmoji(cat: string): string {
  const map: Record<string, string> = {
    biology: '🌱', astronomy: '🌌', physics: '⚡',
    chemistry: '⚗️', technology: '🤖', general: '💡',
  }
  return map[cat] ?? '💡'
}
