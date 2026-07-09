/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "@prisma/client",
      "pdf-parse",
      "mammoth",
      "xlsx",
      "docx",
      "pdf-lib"
    ]
  }
};

export default nextConfig;
