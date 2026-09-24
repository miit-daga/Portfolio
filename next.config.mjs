/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // The CSS goes in the page itself, so the first paint waits on no stylesheet request
    inlineCss: true,
  },
};

export default nextConfig;
