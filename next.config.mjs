import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // The CSS goes in the page itself, so the first paint waits on no stylesheet request
    inlineCss: true,
  },
  webpack: (config, { isServer, webpack }) => {
    // satellite.js (the orbit maths behind the ISS card and the ISRO globe)
    // re-exports an optional WebAssembly build that imports node:module, which
    // a browser bundle can't include; nothing here uses it, so in the browser
    // it's swapped for an empty module (lib/empty-module.js)
    if (!isServer) {
      const empty = fileURLToPath(new URL("./lib/empty-module.js", import.meta.url));
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^\.\/wasm\/index\.js$/, (resource) => {
          if (/satellite\.js/.test(resource.context)) resource.request = empty;
        }),
      );
    }
    return config;
  },
};

export default nextConfig;
