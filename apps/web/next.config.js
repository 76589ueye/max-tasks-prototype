/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['design-tokens', 'shared-types'],
};

module.exports = nextConfig;
