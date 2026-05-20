'use client'

import {
  useEffect, useRef, useImperativeHandle, forwardRef, useCallback
} from 'react'
import type { AnnotationTool, AnnotationColor } from './AnnotationToolbar'

export interface AnnotationCanvasRef {
  getCanvasData: () => object | null
  undo: () => void
  clear: () => void
}

interface DrawShape {
  type: AnnotationTool
  color: AnnotationColor
  lineWidth: number
  points: { x: number; y: number }[]
}

interface AnnotationCanvasProps {
  activeTool: AnnotationTool
  activeColor: AnnotationColor
  width: number
  height: number
}

const AnnotationCanvas = forwardRef<AnnotationCanvasRef, AnnotationCanvasProps>(
  ({ activeTool, activeColor, width, height }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const shapesRef = useRef<DrawShape[]>([])
    const isDrawingRef = useRef(false)
    const currentShapeRef = useRef<DrawShape | null>(null)
    const activeToolRef = useRef(activeTool)
    const activeColorRef = useRef(activeColor)

    useEffect(() => { activeToolRef.current = activeTool }, [activeTool])
    useEffect(() => { activeColorRef.current = activeColor }, [activeColor])

    const redraw = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const drawShape = (shape: DrawShape, ctx: CanvasRenderingContext2D) => {
        ctx.strokeStyle = shape.color
        ctx.lineWidth = shape.lineWidth
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        const pts = shape.points
        if (pts.length < 1) return

        ctx.beginPath()
        if (shape.type === 'rect' && pts.length >= 2) {
          const w = pts[1].x - pts[0].x
          const h = pts[1].y - pts[0].y
          ctx.rect(pts[0].x, pts[0].y, w, h)
        } else if (shape.type === 'circle' && pts.length >= 2) {
          const r = Math.sqrt((pts[1].x - pts[0].x) ** 2 + (pts[1].y - pts[0].y) ** 2) / 2
          ctx.arc(
            (pts[0].x + pts[1].x) / 2,
            (pts[0].y + pts[1].y) / 2,
            r, 0, Math.PI * 2
          )
        } else if (shape.type === 'arrow' && pts.length >= 2) {
          const sx = pts[0].x, sy = pts[0].y, ex = pts[1].x, ey = pts[1].y
          const angle = Math.atan2(ey - sy, ex - sx)
          const headLen = 16
          const headAngle = 0.45
          ctx.moveTo(sx, sy)
          ctx.lineTo(ex, ey)
          ctx.moveTo(ex, ey)
          ctx.lineTo(ex - headLen * Math.cos(angle - headAngle), ey - headLen * Math.sin(angle - headAngle))
          ctx.moveTo(ex, ey)
          ctx.lineTo(ex - headLen * Math.cos(angle + headAngle), ey - headLen * Math.sin(angle + headAngle))
        } else if (shape.type === 'freehand') {
          if (pts.length < 2) return
          ctx.moveTo(pts[0].x, pts[0].y)
          pts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y))
        } else if (shape.type === 'text' && pts.length >= 1) {
          ctx.font = `bold 18px sans-serif`
          ctx.fillStyle = shape.color
          ctx.fillText('← クリック', pts[0].x, pts[0].y)
          return
        }
        ctx.stroke()
      }

      shapesRef.current.forEach((s) => drawShape(s, ctx))
      if (currentShapeRef.current) drawShape(currentShapeRef.current, ctx)
    }, [])

    const getPoint = useCallback((e: MouseEvent | TouchEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX
      const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : e.clientY
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      }
    }, [])

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const onMouseDown = (e: MouseEvent) => {
        const pt = getPoint(e)
        if (!pt) return
        isDrawingRef.current = true
        const shape: DrawShape = {
          type: activeToolRef.current,
          color: activeColorRef.current,
          lineWidth: 2.5,
          points: [pt],
        }
        currentShapeRef.current = shape
        redraw()
      }

      const onMouseMove = (e: MouseEvent) => {
        if (!isDrawingRef.current || !currentShapeRef.current) return
        const pt = getPoint(e)
        if (!pt) return

        if (currentShapeRef.current.type === 'freehand') {
          currentShapeRef.current.points.push(pt)
        } else {
          currentShapeRef.current.points[1] = pt
        }
        redraw()
      }

      const onMouseUp = () => {
        if (!isDrawingRef.current || !currentShapeRef.current) return
        isDrawingRef.current = false
        if (currentShapeRef.current.points.length >= 1) {
          shapesRef.current.push(currentShapeRef.current)
        }
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
    }, [getPoint, redraw])

    useImperativeHandle(ref, () => ({
      getCanvasData() {
        return { shapes: shapesRef.current }
      },
      undo() {
        shapesRef.current.pop()
        redraw()
      },
      clear() {
        shapesRef.current = []
        currentShapeRef.current = null
        redraw()
      },
    }))

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0 w-full h-full"
        style={{
          cursor: activeTool === 'text' ? 'text' : 'crosshair',
          touchAction: 'none',
        }}
      />
    )
  }
)

AnnotationCanvas.displayName = 'AnnotationCanvas'
export default AnnotationCanvas
