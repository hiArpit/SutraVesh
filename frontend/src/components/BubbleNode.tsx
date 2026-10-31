import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'

interface BubbleData extends Record<string, unknown> {
  label: string
  category: string
  description: string
}

type BubbleNodeType = Node<BubbleData>

const CATEGORY_COLORS: Record<string, string> = {
  biology:    'from-green-500 to-emerald-700 border-green-400',
  astronomy:  'from-indigo-500 to-purple-800 border-indigo-400',
  physics:    'from-cyan-500 to-blue-700 border-cyan-400',
  chemistry:  'from-yellow-400 to-orange-600 border-yellow-400',
  technology: 'from-pink-500 to-rose-700 border-pink-400',
  general:    'from-violet-500 to-purple-700 border-violet-400',
}

export default memo(function BubbleNode({ data }: NodeProps<BubbleNodeType>) {
  const colors = CATEGORY_COLORS[data.category] ?? CATEGORY_COLORS.general

  return (
    <div
      className={`node-bubble relative flex flex-col items-center justify-center
        w-28 h-28 rounded-full border-2 bg-gradient-to-br ${colors}
        cursor-pointer select-none shadow-xl transition-transform hover:scale-110 group`}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />

      <span className="text-2xl mb-1">
        {categoryEmoji(data.category)}
      </span>

      <p className="text-xs font-bold text-center text-white leading-tight px-1 truncate w-full text-center">
        {data.label}
      </p>

      {data.description && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48
          bg-slate-800 border border-slate-600 text-xs text-slate-200 rounded-lg p-2
          opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-lg
          transition-opacity duration-200">
          {data.description.slice(0, 100)}…
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  )
})

function categoryEmoji(cat: string): string {
  const map: Record<string, string> = {
    biology: '🌿', astronomy: '🌌', physics: '⚡',
    chemistry: '⚗️', technology: '🤖', general: '💡',
  }
  return map[cat] ?? '💡'
}
