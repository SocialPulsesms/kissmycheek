import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: [
    'kissmycheek.test', 
    '*.test', 
    'localhost', 
    '127.0.0.1', 
    '10.0.2.2', 
    '192.168.*',
    'localhost:3000', 
    '10.0.2.2:3000',
    '127.0.0.1:3000',
    '192.168.1.134:3000'
  ],
};

export default nextConfig;
