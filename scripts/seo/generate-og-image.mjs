/**
 * Generates public/og-image.png (1200x630) for Open Graph.
 * Run: node scripts/seo/generate-og-image.mjs
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outputPath = join(__dirname, '../../public/og-image.png')

const width = 1200
const height = 630

const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#061a3d"/>
      <stop offset="100%" style="stop-color:#0f2d5c"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <text x="80" y="200" fill="#10b981" font-family="system-ui, sans-serif" font-size="36" font-weight="600">교대 근무표 AI 솔루션</text>
  <text x="80" y="300" fill="#ffffff" font-family="system-ui, sans-serif" font-size="72" font-weight="700">EveryShift</text>
  <text x="80" y="380" fill="#e5e7eb" font-family="system-ui, sans-serif" font-size="44" font-weight="600">모두의 근무표</text>
  <text x="80" y="460" fill="#9ca3af" font-family="system-ui, sans-serif" font-size="28">근무표의 모든 것 — 간호사·교대 근무 스케줄링</text>
</svg>
`

await sharp(Buffer.from(svg)).png().toFile(outputPath)
console.log(`Wrote ${outputPath}`)
