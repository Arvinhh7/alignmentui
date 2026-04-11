/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

const nextConfig = {
  // Static export only in production (Cloudflare Pages).
  // In dev mode, skip it so dynamic [id] routes render without generateStaticParams errors.
  ...(isProd ? { output: 'export' } : {}),
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
