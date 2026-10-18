// Converts neon-on-black symbol art into transparent PNGs: brightness becomes alpha
// and colors are un-premultiplied, so the result over black matches the source.
import { readdir } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import sharp from 'sharp'

const SRC_DIR = 'art/symbols'
const OUT_DIR = 'public/assets/symbols'
const SIZE = 384
const BLACK_POINT = 12

const files = (await readdir(SRC_DIR)).filter((f) => /\.(jpe?g|png)$/i.test(f))

for (const file of files) {
  const { data, info } = await sharp(join(SRC_DIR, file))
    .resize(SIZE, SIZE, { fit: 'contain', background: '#000' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const out = Buffer.alloc(info.width * info.height * 4)
  for (let i = 0, o = 0; i < data.length; i += 3, o += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const max = Math.max(r, g, b)
    const alpha = Math.min(1, Math.max(0, (max - BLACK_POINT) / (255 - BLACK_POINT)))
    if (alpha === 0) continue
    out[o] = Math.min(255, Math.round(r / alpha))
    out[o + 1] = Math.min(255, Math.round(g / alpha))
    out[o + 2] = Math.min(255, Math.round(b / alpha))
    out[o + 3] = Math.round(alpha * 255)
  }

  const target = join(OUT_DIR, `${basename(file, extname(file))}.png`)
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9, palette: false })
    .toFile(target)
  console.log(`✓ ${target}`)
}
