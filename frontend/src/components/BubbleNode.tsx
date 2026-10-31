import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'

interface BubbleData extends Record<string, unknown> {
  label: string
  category: string
  description?: string
  what_is_it?: string
  fun_fact?: string
  try_this?: string
  grade_level?: string
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
      {/* 4-way connection points for natural threads in all directions */}
      <Handle type="target" position={Position.Top} className="opacity-0 !w-4 !h-4" />
      <Handle type="source" position={Position.Bottom} className="opacity-0 !w-4 !h-4" />
      <Handle type="target" position={Position.Left} className="opacity-0 !w-4 !h-4" />
      <Handle type="source" position={Position.Right} className="opacity-0 !w-4 !h-4" />

      <span className="text-2xl mb-0.5 filter drop-shadow">
        {categoryEmoji(data.category)}
      </span>

      <p className="text-xs font-black text-center text-white leading-tight px-2 truncate w-full text-center tracking-tight">
        {data.label}
      </p>

      {(data.what_is_it || data.description) && (
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-60
          bg-white text-slate-800 border-2 border-orange-200 text-xs rounded-2xl p-3.5
          opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-2xl
          transition-opacity duration-200">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-orange-600 text-[11px] capitalize">🌿 {data.category}</span>
            <span className="text-[10px] text-slate-400 font-bold">{data.grade_level || 'Grade 1.3'}</span>
          </div>
          <p className="text-slate-800 font-medium text-[11px] leading-relaxed mb-1.5">
            {data.what_is_it || data.description}
          </p>
          {data.fun_fact && (
            <p className="text-amber-800 bg-amber-50 rounded-xl p-1.5 text-[10px] font-semibold leading-tight border border-amber-100">
              ☀️ {data.fun_fact}
            </p>
          )}
        </div>
      )}
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
