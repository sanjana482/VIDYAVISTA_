/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  staticPageGenerationTimeout: 180, // seconds (default 60)
};

export default nextConfig;


