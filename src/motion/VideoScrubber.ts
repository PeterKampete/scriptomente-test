/**
 * Scroll-scrubbed video, drawn into a canvas.
 *
 * Seeking a normal MP4 can take 100–200 ms per jump (it decodes from the
 * previous keyframe), which makes scroll control stutter. So once loaded, the
 * video is played through once, muted and off-screen, and every frame is
 * captured as a small JPEG. Scrubbing then decodes the nearest cached frame,
 * which takes a few ms. Until a frame is cached it falls back to seeking.
 */
type Crop = { top: number; bottom: number }
type CachedFrame = { time: number; blob: Blob }

export class VideoScrubber {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D | null
  private src: string
  private crop: Crop
  private url = ''
  private video: HTMLVideoElement | null = null
  private frames: CachedFrame[] = []
  private duration = 0
  private target = 0
  private pending = 0
  private seeking = false
  private decoding = false
  private drawnFrame = -1
  private destroyed = false
  private onFirstFrame?: () => void

  constructor(src: string, canvas: HTMLCanvasElement, crop: Crop, onFirstFrame?: () => void) {
    this.src = src
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.crop = crop
    this.onFirstFrame = onFirstFrame
  }

  async load() {
    // Fetch the whole file once so every seek is local
    const blob = await fetch(this.src).then((res) => res.blob())
    if (this.destroyed) return
    this.url = URL.createObjectURL(blob)
    const video = this.makeVideo()
    this.video = video
    await new Promise<void>((resolve, reject) => {
      video.addEventListener('loadeddata', () => resolve(), { once: true })
      video.addEventListener('error', () => reject(new Error('video failed')), { once: true })
    })
    if (this.destroyed) return
    this.duration = video.duration
    this.canvas.width = video.videoWidth
    this.canvas.height = video.videoHeight - this.crop.top - this.crop.bottom
    video.addEventListener('seeked', this.onSeeked)
    this.setProgress(this.pending)
    this.capture()
  }

  /** 0 → first frame, 1 → last frame. */
  setProgress(progress: number) {
    if (!this.duration) {
      this.pending = progress
      return
    }
    this.target = Math.min(this.duration - 0.03, Math.max(0, progress * this.duration))
    this.render()
  }

  destroy() {
    this.destroyed = true
    this.video?.remove()
    this.video = null
    if (this.url) URL.revokeObjectURL(this.url)
    this.frames = []
  }

  private makeVideo() {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.src = this.url
    video.setAttribute('aria-hidden', 'true')
    video.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none'
    document.body.appendChild(video)
    return video
  }

  private draw(source: CanvasImageSource, fromVideo: boolean) {
    const ctx = this.ctx
    if (!ctx) return
    const { width, height } = this.canvas
    if (fromVideo) ctx.drawImage(source, 0, this.crop.top, width, height, 0, 0, width, height)
    else ctx.drawImage(source, 0, 0, width, height)
    if (this.onFirstFrame) {
      this.onFirstFrame()
      this.onFirstFrame = undefined
    }
  }

  private nearestFrame(time: number) {
    const frames = this.frames
    if (!frames.length || time > frames[frames.length - 1].time + 0.05) return -1
    let lo = 0
    let hi = frames.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (frames[mid].time < time) lo = mid + 1
      else hi = mid
    }
    if (lo > 0 && Math.abs(frames[lo - 1].time - time) < Math.abs(frames[lo].time - time)) lo -= 1
    return lo
  }

  private render() {
    if (!this.video) return
    const index = this.nearestFrame(this.target)
    if (index >= 0) {
      if (index === this.drawnFrame || this.decoding) return
      this.decoding = true
      createImageBitmap(this.frames[index].blob)
        .then((bitmap) => {
          this.draw(bitmap, false)
          bitmap.close()
          this.drawnFrame = index
        })
        .finally(() => {
          this.decoding = false
          // Catch up if the scroll moved on while decoding
          if (this.nearestFrame(this.target) !== this.drawnFrame) this.render()
        })
      return
    }
    if (this.seeking) return
    this.seeking = true
    this.video.currentTime = this.target
  }

  private onSeeked = () => {
    this.seeking = false
    if (!this.video) return
    this.draw(this.video, true)
    this.drawnFrame = -1
    if (Math.abs(this.video.currentTime - this.target) > 0.04) this.render()
  }

  /** Plays a second copy through once, capturing each frame as a JPEG. */
  private capture() {
    type FrameCallbackVideo = HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number
    }
    const probe = document.createElement('video') as FrameCallbackVideo
    if (typeof probe.requestVideoFrameCallback !== 'function') return
    const grab = this.makeVideo() as FrameCallbackVideo
    const scratch = document.createElement('canvas')
    scratch.width = this.canvas.width
    scratch.height = this.canvas.height
    const sctx = scratch.getContext('2d')
    if (!sctx) return
    const { top } = this.crop
    const onFrame = (_now: number, meta: { mediaTime: number }) => {
      if (this.destroyed) return
      sctx.drawImage(grab, 0, top, scratch.width, scratch.height, 0, 0, scratch.width, scratch.height)
      const time = meta.mediaTime
      scratch.toBlob(
        (blob) => {
          if (!blob || this.destroyed) return
          this.frames.push({ time, blob })
          this.frames.sort((a, b) => a.time - b.time)
        },
        'image/jpeg',
        0.86,
      )
      if (!grab.ended) grab.requestVideoFrameCallback?.(onFrame)
    }
    grab.addEventListener('ended', () => grab.remove(), { once: true })
    grab.addEventListener(
      'loadeddata',
      () => {
        grab.requestVideoFrameCallback?.(onFrame)
        grab.play().catch(() => grab.remove())
      },
      { once: true },
    )
  }
}
