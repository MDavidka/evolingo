/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['urban-offline-corporation-integrated.trycloudflare.com', '3001-agqxd3e74c7cuqxdchaoifqdnq.instabox.tech'],
  devIndicators: false,
  async redirects() {
    return [
      { source: "/bejelentkezes", destination: "/belepes", permanent: false },
      ...["/utvonal", "/temak", "/lecke", "/gyakorlas", "/szokartyak", "/ranglista", "/baratok", "/bolt"]
        .map(source => ({ source, destination: "/chat", permanent: false })),
      ...["/temak/:path*", "/lecke/:path*", "/gyakorlas/:path*", "/szokartyak/:path*"]
        .map(source => ({ source, destination: "/chat", permanent: false })),
    ]
  },
}

export default nextConfig
