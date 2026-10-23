/** @type {import('next').NextConfig} */
// output: 'standalone' produces .next/standalone with a minimal server bundle
// (server.js + only the node_modules the server actually needs) for
// deployment. The API proxy lives in src/app/api/[...path]/route.ts.
const nextConfig = {
  output: 'standalone',
};

export default nextConfig;
