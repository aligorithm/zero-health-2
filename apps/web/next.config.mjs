/** @type {import('next').NextConfig} */
// /api/* is proxied to the Express backend by src/app/api/[...path]/route.ts.
// Override the backend origin at runtime with the API_ORIGIN env var
// (default: http://127.0.0.1:4000).
const nextConfig = {};

export default nextConfig;
