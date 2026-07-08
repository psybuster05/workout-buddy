import sharp from 'sharp'
import { statSync, unlinkSync } from 'node:fs'

// [source Jon dropped in, output name the app references]
const jobs = [
  ['push2.jpg', 'push.jpg'],
  ['pull2.webp', 'pull.jpg'],
  ['leg2.jpg', 'leg.jpg'],
]

for (const [src, dst] of jobs) {
  await sharp(`public/days/${src}`)
    // wide banner crop; "attention" keeps the most salient region (the lifter)
    .resize({ width: 1024, height: 400, fit: 'cover', position: sharp.strategy.attention })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(`public/days/${dst}`)
  unlinkSync(`public/days/${src}`)
  console.log(`${src} -> ${dst}  ${(statSync(`public/days/${dst}`).size / 1024).toFixed(0)}KB`)
}
