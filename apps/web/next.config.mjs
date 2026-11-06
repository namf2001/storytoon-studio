/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@storytoon/video-engine", "@storytoon/shared-types"],
  async rewrites() {
    return [
      {
        source: "/media/:path*",
        destination: "http://127.0.0.1:9090/media/:path*",
      },
      {
        source: "/storage/:path*",
        destination: "http://127.0.0.1:9090/media/:path*",
      },
    ];
  },
};
export default nextConfig;
