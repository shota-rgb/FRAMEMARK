'use client'

import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback, useState } from 'react'
import type { AnnotationTool, AnnotationColor } from './AnnotationToolbar'

export interface AnnotationCanvasRef {
  getCanvasData: () => { shapes: DrawShape[]; canvasWidth: number; canvasHeight: number }
  undo: () => void
  clear: () => void
  loadShapes: (shapes: DrawShape[], savedWidth?: number, savedHeight?: number) => void
}

export interface DrawShape {
  type: AnnotationTool
  color: AnnotationColor
  lineWidth: number
  points: { x: number; y: number }[]
  text?: string
}

interface TextPending {
  screenX: number
  screenY: number
  canvasX: number
  canvasY: number
}

interface AnnotationCanvasProps {
  activeTool: AnnotationTool
  activeColor: AnnotationColor
  width: number
  height: number
}

function distToSegment(
  pt: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = b.x - a.x, dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(pt.x - a.x, pt.y - a.y)
  const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / len2))
  return Math.hypot(pt.x - a.x - t * dx, pt.y - a.y - t * dy)
}

function hitTest(pt: { x: number; y: number }, shape: DrawShape, thr = 10): boolean {
  const p = shape.points
  if (p.length < 1) return false
  switch (shape.type) {
    case 'rect': {
      if (p.length < 2) return false
      const x0 = Math.min(p[0].x, p[1].x), y0 = Math.min(p[0].y, p[1].y)
      const x1 = Math.max(p[0].x, p[1].x), y1 = Math.max(p[0].y, p[1].y)
      return pt.x >= x0 - thr && pt.x <= x1 + thr && pt.y >= y0 - thr && pt.y <= y1 + thr
    }
    case 'circle': {
      if (p.length < 2) return false
      const cx = (p[0].x + p[1].x) / 2, cy = (p[0].y + p[1].y) / 2
      const r = Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y) / 2
      return Math.hypot(pt.x - cx, pt.y - cy) <= r + thr
    }
    case 'arrow':
      return p.length >= 2 ? distToSegment(pt, p[0], p[1]) <= thr : false
    case 'freehand':
      for (let i = 0; i < p.length - 1; i++)
        if (distToSegment(pt, p[i], p[i + 1]) <= thr) return true
      return false
    case 'text': {
      const w = (shape.text?.length ?? 3) * 12
      return pt.x >= p[0].x - thr && pt.x <= p[0].x + w + thr &&
             pt.y >= p[0].y - 22 && pt.y <= p[0].y + thr
    }
    default:
      return false
  }
}

const AnnotationCanvas = forwardRef<AnnotationCanvasRef, AnnotationCanvasProps>(
  ({ activeTool, activeColor, width, height }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const shapesRef = useRef<DrawShape[]>([])
    const isDrawingRef = useRef(false)
    const currentShapeRef = useRef<DrawShape | null>(null)
    const activeToolRef = useRef(activeTool)
    const activeColorRef = useRef(activeColor)
    const selectedIdxRef = useRef<number | null>(null)
    const dragStartRef = useRef<{ x: number; y: number } | null>(null)

    const [textPending, setTextPending] = useState<TextPending | null>(null)
    const [textValue, setTextValue] = useState('')
    const textInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => { activeToolRef.current = activeTool }, [activeTool])
    useEffect(() => { activeColorRef.current = activeColor }, [activeColor])

    // テキストツール切替時にテキスト入力をキャンセル
    useEffect(() => {
      if (activeTool !== 'text') {
        setTextPending(null)
        setTextValue('')
      }
    }, [activeTool])

    const drawShape = useCallback((shape: DrawShape, ctx: CanvasRenderingContext2D) => {
      ctx.strokeStyle = shape.color
      ctx.fillStyle = shape.color
      ctx.lineWidth = shape.lineWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      const pts = shape.points
      if (pts.length < 1) return
      ctx.beginPath()
      switch (shape.type) {
        case 'rect':
          if (pts.length < 2) return
          ctx.rect(pts[0].x, pts[0].y, pts[1].x - pts[0].x, pts[1].y - pts[0].y)
          ctx.stroke(); break
        case 'circle': {
          if (pts.length < 2) return
          const r = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) / 2
          ctx.arc((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2, r, 0, Math.PI * 2)
          ctx.stroke(); break
        }
        case 'arrow': {
          if (pts.length < 2) return
          const sx = pts[0].x, sy = pts[0].y, ex = pts[1].x, ey = pts[1].y
          const angle = Math.atan2(ey - sy, ex - sx)
          const headLen = 16, headAngle = 0.45
          ctx.moveTo(sx, sy); ctx.lineTo(ex, ey)
          ctx.moveTo(ex, ey)
          ctx.lineTo(ex - headLen * Math.cos(angle - headAngle), ey - headLen * Math.sin(angle - headAngle))
          ctx.moveTo(ex, ey)
          ctx.lineTo(ex - headLen * Math.cos(angle + headAngle), ey - headLen * Math.sin(angle + headAngle))
          ctx.stroke(); break
        }
        case 'freehand':
          if (pts.length < 2) return
          ctx.moveTo(pts[0].x, pts[0].y)
          pts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y))
          ctx.stroke(); break
        case 'text':
          ctx.font = 'bold 18px sans-serif'
          ctx.fillText(shape.text ?? '', pts[0].x, pts[0].y); break
        default: break
      }
    }, [])

    const redraw = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      shapesRef.current.forEach((s) => drawShape(s, ctx))
      if (currentShapeRef.current) drawShape(currentShapeRef.current, ctx)
    }, [drawShape])

    const commitText = useCallback((value: string, pending: TextPending) => {
      if (value.trim()) {
        shapesRef.current.push({
          type: 'text',
          color: activeColorRef.current,
          lineWidth: 2.5,
          points: [{ x: pending.canvasX, y: pending.canvasY }],
          text: value.trim(),
        })
        redraw()
      }
      setTextPending(null)
      setTextValue('')
    }, [redraw])

    // テキストツール以外の操作はネイティブリスナーで処理
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const getPoint = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height
        return {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY,
        }
      }

      const onMouseDown = (e: MouseEvent) => {
        const tool = activeToolRef.current
        // テキストツールはオーバーレイ div の onClick で処理するのでスキップ
        if (tool === 'text') return

        const pt = getPoint(e)

        if (tool === 'select') {
          for (let i = shapesRef.current.length - 1; i >= 0; i--) {
            if (hitTest(pt, shapesRef.current[i])) {
              selectedIdxRef.current = i
              dragStartRef.current = pt
              canvas.style.cursor = 'grabbing'
              return
            }
          }
          selectedIdxRef.current = null
          dragStartRef.current = null
          return
        }

        isDrawingRef.current = true
        currentShapeRef.current = {
          type: tool,
          color: activeColorRef.current,
          lineWidth: 2.5,
          points: [pt],
        }
        redraw()
      }

      const onMouseMove = (e: MouseEvent) => {
        const tool = activeToolRef.current
        if (tool === 'select') {
          if (selectedIdxRef.current === null || !dragStartRef.current) return
          const pt = getPoint(e)
          const dx = pt.x - dragStartRef.current.x
          const dy = pt.y - dragStartRef.current.y
          const shape = shapesRef.current[selectedIdxRef.current]
          shape.points = shape.points.map((p) => ({ x: p.x + dx, y: p.y + dy }))
          dragStartRef.current = pt
          redraw()
          return
        }
        if (!isDrawingRef.current || !currentShapeRef.current) return
        const pt = getPoint(e)
        if (currentShapeRef.current.type === 'freehand') {
          currentShapeRef.current.points.push(pt)
        } else {
          currentShapeRef.current.points[1] = pt
        }
        redraw()
      }

      const onMouseUp = () => {
        if (activeToolRef.current === 'select') {
          dragStartRef.current = null
          canvas.style.cursor = 'grab'
          return
        }
        if (!isDrawingRef.current || !currentShapeRef.current) return
        isDrawingRef.current = false
        if (currentShapeRef.current.points.length >= 1) shapesRef.current.push(currentShapeRef.current)
        currentShapeRef.current = null
        redraw()
      }

      canvas.addEventListener('mousedown', onMouseDown)
      canvas.addEventListener('mousemove', onMouseMove)
      canvas.addEventListener('mouseup', onMouseUp)
      canvas.addEventListener('mouseleave', onMouseUp)
      return () => {
        canvas.removeEventListener('mousedown', onMouseDown)
        canvas.removeEventListener('mousemove', onMouseMove)
        canvas.removeEventListener('mouseup', onMouseUp)
        canvas.removeEventListener('mouseleave', onMouseUp)
      }
    }, [redraw])

    // テキスト入力が表示されたらフォーカス
    useEffect(() => {
      if (textPending) textInputRef.current?.focus()
    }, [textPending])

    // ツール切替時にカーソルをリセット
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      if (activeTool === 'select') canvas.style.cursor = 'grab'
      else if (activeTool === 'text') canvas.style.cursor = 'text'
      else canvas.style.cursor = 'crosshair'
    }, [activeTool])

    useImperativeHandle(ref, () => ({
      getCanvasData() {
        const canvas = canvasRef.current
        return {
          shapes: shapesRef.current,
          canvasWidth: canvas?.width ?? width,
          canvasHeight: canvas?.height ?? height,
        }
      },
      undo() { shapesRef.current.pop(); redraw() },
      clear() { shapesRef.current = []; currentShapeRef.current = null; redraw() },
      loadShapes(shapes: DrawShape[], savedWidth?: number, savedHeight?: number) {
        const canvas = canvasRef.current
        if (savedWidth && savedHeight && canvas && (savedWidth !== canvas.width || savedHeight !== canvas.height)) {
          const sx = canvas.width / savedWidth
          const sy = canvas.height / savedHeight
          shapesRef.current = shapes.map((shape) => ({
            ...shape,
            points: shape.points.map((p) => ({ x: p.x * sx, y: p.y * sy })),
          }))
        } else {
          shapesRef.current = [...shapes]
        }
        currentShapeRef.current = null
        redraw()
      },
    }))

    // テキストツール用: React合成イベントで確実にstate更新するオーバーレイ
    const handleTextOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      setTextPending({ screenX: sx, screenY: sy, canvasX: sx * scaleX, canvasY: sy * scaleY })
      setTextValue('')
    }, [])

    return (
      <div className="w-full h-full relative">
        {/* 描画キャンバス */}
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: 'none' }}
        />

        {/* テキストツール用クリックオーバーレイ（React合成イベントで確実に動作） */}
        {activeTool === 'text' && !textPending && (
          <div
            className="absolute inset-0"
            style={{ cursor: 'text' }}
            onClick={handleTextOverlayClick}
          />
        )}

        {/* テキスト入力欄 */}
        {textPending && (
          <input
            ref={textInputRef}
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitText(textValue, textPending)
              if (e.key === 'Escape') { setTextPending(null); setTextValue('') }
            }}
            onBlur={() => { if (textPending) commitText(textValue, textPending) }}
            placeholder="テキストを入力… Enter で確定"
            className="absolute bg-transparent outline-none border-b-2 border-dashed text-lg font-bold min-w-36 placeholder-white/40"
            style={{
              left: textPending.screenX,
              top: textPending.screenY - 22,
              color: activeColor,
              borderColor: activeColor,
            }}
          />
        )}
      </div>
    )
  }
)

AnnotationCanvas.displayName = 'AnnotationCanvas'
export default AnnotationCanvas
