'use client'

import { Minus, Circle, ArrowRight, Pencil, Type, Undo2, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AnnotationTool = 'rect' | 'circle' | 'arrow' | 'freehand' | 'text'
export type AnnotationColor = '#ef4444' | '#f97316' | '#eab308' | '#22c55e' | '#3b82f6' | '#a855f7' | '#ffffff'

const TOOLS: { id: AnnotationTool; icon: React.ElementType; label: string }[] = [
  { id: 'rect', icon: Minus, label: '矩形' },
  { id: 'circle', icon: Circle, label: '円' },
  { id: 'arrow', icon: ArrowRight, label: '矢印' },
  { id: 'freehand', icon: Pencil, label: 'フリーハンド' },
  { id: 'text', icon: Type, label: 'テキスト' },
]

const COLORS: AnnotationColor[] = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ffffff'
]

interface AnnotationToolbarProps {
  activeTool: AnnotationTool
  activeColor: AnnotationColor
  onToolChange: (tool: AnnotationTool) => void
  onColorChange: (color: AnnotationColor) => void
  onUndo: () => void
  onClear: () => void
  onClose: () => void
}

export default function AnnotationToolbar({
  activeTool, activeColor,
  onToolChange, onColorChange,
  onUndo, onClear, onClose
}: AnnotationToolbarProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-[#1a1a1a] border-t border-[#2a2a2a]">
      <span className="text-xs text-[#666] mr-1">ツール</span>

      {TOOLS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          title={label}
          onClick={() => onToolChange(id)}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            activeTool === id ? 'bg-indigo-600 text-white' : 'text-[#666] hover:text-white hover:bg-[#252525]'
          )}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}

      <div className="w-px h-5 bg-[#333] mx-1" />

      <span className="text-xs text-[#666]">色</span>
      {COLORS.map((color) => (
        <button
          key={color}
          onClick={() => onColorChange(color)}
          className={cn(
            'w-5 h-5 rounded-full transition-all',
            activeColor === color ? 'ring-2 ring-offset-1 ring-offset-[#1a1a1a] ring-white scale-110' : ''
          )}
          style={{ backgroundColor: color }}
        />
      ))}

      <div className="flex-1" />

      <button
        onClick={onUndo}
        title="元に戻す"
        className="p-1.5 rounded-lg text-[#666] hover:text-white hover:bg-[#252525] transition-colors"
      >
        <Undo2 className="w-4 h-4" />
      </button>
      <button
        onClick={onClear}
        title="すべて消去"
        className="p-1.5 rounded-lg text-[#666] hover:text-red-400 hover:bg-[#252525] transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
      <button
        onClick={onClose}
        title="アノテーションモードを終了"
        className="p-1.5 rounded-lg text-[#666] hover:text-white hover:bg-[#252525] transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
