'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Maximize, Minimize, Settings
} from 'lucide-react'
import { formatTimecode, cn } from '@/lib/utils'

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4]

interface VideoPlayerProps {
  src: string
  onTimeUpdate?: (time: number) => void
  onSeek?: (time: number) => void
  seekTo?: number | null
}

export default function VideoPlayer({ src, onTimeUpdate, onSeek, seekTo }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [fullscreen, setFullscreen] = useState(false)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Seek when external seekTo changes
  useEffect(() => {
    if (seekTo != null && videoRef.current) {
      videoRef.current.currentTime = seekTo
      setCurrentTime(seekTo)
    }
  }, [seekTo])

  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    clearTimeout(controlsTimerRef.current)
    if (playing) {
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000)
    }
  }, [playing])

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) }
    else { v.pause(); setPlaying(false) }
  }, [])

  const skip = useCallback((sec: number) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + sec))
  }, [])

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    setCurrentTime(v.currentTime)
    onTimeUpdate?.(v.currentTime)
  }, [onTimeUpdate])

  const handleProgressClick = useCallback((e: React.MouseEvent) => {
    const bar = progressRef.current
    const v = videoRef.current
    if (!bar || !v) return
    const rect = bar.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    const t = ratio * v.duration
    v.currentTime = t
    onSeek?.(t)
  }, [onSeek])

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    setVolume(val)
    if (videoRef.current) videoRef.current.volume = val
    setMuted(val === 0)
  }

  const toggleMute = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  const changeSpeed = (s: number) => {
    setSpeed(s)
    if (videoRef.current) videoRef.current.playbackRate = s
    setShowSpeedMenu(false)
  }

  const toggleFullscreen = async () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen()
      setFullscreen(true)
    } else {
      await document.exitFullscreen()
      setFullscreen(false)
    }
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      ref={containerRef}
      className="relative bg-black group"
      onMouseMove={resetControlsTimer}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full block"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />

      {/* Controls overlay */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent px-4 pb-3 pt-8 transition-opacity duration-300',
          showControls || !playing ? 'opacity-100' : 'opacity-0'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div
          ref={progressRef}
          className="h-1 bg-white/20 rounded-full cursor-pointer mb-3 group/progress relative"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-indigo-500 rounded-full relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full -translate-x-1/2 opacity-0 group-hover/progress:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-3">
          <button onClick={() => skip(-5)} className="text-white/70 hover:text-white transition-colors">
            <SkipBack className="w-4 h-4" />
          </button>

          <button onClick={togglePlay} className="text-white hover:text-indigo-300 transition-colors">
            {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>

          <button onClick={() => skip(5)} className="text-white/70 hover:text-white transition-colors">
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Timecode */}
          <span className="text-white/70 text-xs font-mono tabular-nums">
            {formatTimecode(currentTime)} / {formatTimecode(duration)}
          </span>

          <div className="flex-1" />

          {/* Volume */}
          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="text-white/70 hover:text-white transition-colors">
              {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 h-1 accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Speed */}
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className="flex items-center gap-1 text-white/70 hover:text-white text-xs transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              {speed}x
            </button>
            {showSpeedMenu && (
              <div className="absolute bottom-8 right-0 bg-[#1a1a1a] border border-[#333] rounded-lg overflow-hidden shadow-xl z-50">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    onClick={() => changeSpeed(s)}
                    className={cn(
                      'block w-full text-left px-4 py-1.5 text-sm hover:bg-[#252525] transition-colors',
                      speed === s ? 'text-indigo-400' : 'text-white/70'
                    )}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="text-white/70 hover:text-white transition-colors">
            {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Center play icon */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/40 rounded-full p-4">
            <Play className="w-8 h-8 text-white" />
          </div>
        </div>
      )}
    </div>
  )
}
