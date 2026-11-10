/**
 * Minimal dotLottie (.lottie) reader. A .lottie file is a zip holding a
 * manifest and one or more Lottie JSON animations; this pulls out the first
 * animation using the browser's own DecompressionStream, so no player library
 * beyond lottie-web is needed.
 */
type ZipEntry = { name: string; method: number; size: number; offset: number }

function readEntries(view: DataView): ZipEntry[] {
  // End of central directory record: scan back from the end for its signature
  let eocd = -1
  for (let i = view.byteLength - 22; i >= Math.max(0, view.byteLength - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('dotLottie: not a zip archive')
  const count = view.getUint16(eocd + 10, true)
  let cursor = view.getUint32(eocd + 16, true)
  const decoder = new TextDecoder()
  const entries: ZipEntry[] = []
  for (let i = 0; i < count; i++) {
    if (view.getUint32(cursor, true) !== 0x02014b50) break
    const method = view.getUint16(cursor + 10, true)
    const size = view.getUint32(cursor + 20, true)
    const nameLength = view.getUint16(cursor + 28, true)
    const extraLength = view.getUint16(cursor + 30, true)
    const commentLength = view.getUint16(cursor + 32, true)
    const offset = view.getUint32(cursor + 42, true)
    const name = decoder.decode(new Uint8Array(view.buffer, view.byteOffset + cursor + 46, nameLength))
    entries.push({ name, method, size, offset })
    cursor += 46 + nameLength + extraLength + commentLength
  }
  return entries
}

async function readFile(buffer: ArrayBuffer, entry: ZipEntry): Promise<string> {
  const view = new DataView(buffer)
  // The local header repeats the name / extra lengths; the data follows them
  const start = entry.offset + 30 + view.getUint16(entry.offset + 26, true) + view.getUint16(entry.offset + 28, true)
  const raw = new Uint8Array(buffer, start, entry.size)
  if (entry.method === 0) return new TextDecoder().decode(raw)
  if (entry.method !== 8) throw new Error(`dotLottie: unsupported compression ${entry.method}`)
  const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Response(stream).text()
}

/** Fetches a .lottie file and returns its first animation's JSON data. */
export async function loadDotLottie(url: string): Promise<Record<string, unknown>> {
  const buffer = await fetch(url).then((res) => {
    if (!res.ok) throw new Error(`dotLottie: ${res.status}`)
    return res.arrayBuffer()
  })
  const entries = readEntries(new DataView(buffer))
  const animation =
    entries.find((entry) => /^animations\/.+\.json$/i.test(entry.name)) ??
    entries.find((entry) => entry.name.toLowerCase().endsWith('.json') && !/manifest/i.test(entry.name))
  if (!animation) throw new Error('dotLottie: no animation inside')
  return JSON.parse(await readFile(buffer, animation)) as Record<string, unknown>
}

type Rgb = [number, number, number]

/**
 * Recolours every fill / stroke in a Lottie animation. `map` receives each
 * static colour (0–1 channels) and returns the replacement.
 */
export function recolorLottie(data: unknown, map: (color: Rgb) => Rgb): void {
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (!node || typeof node !== 'object') return
    const item = node as Record<string, unknown>
    if ((item.ty === 'fl' || item.ty === 'st') && item.c && typeof item.c === 'object') {
      const color = item.c as { a?: number; k?: unknown }
      if (!color.a && Array.isArray(color.k) && color.k.length >= 3 && typeof color.k[0] === 'number') {
        const [r, g, b] = map([color.k[0], color.k[1] as number, color.k[2] as number])
        color.k = [r, g, b, ...(color.k.slice(3) as number[])]
      }
    }
    Object.values(item).forEach(walk)
  }
  walk(data)
}
