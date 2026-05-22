import type { NextConfig } from "next";

/** Quick Look iOS attend souvent ce MIME pour les USDZ servis en HTTPS. */
const USDZ_DEMO_HEADERS = [
  { key: "Content-Type", value: "model/vnd.usdz+zip" },
  { key: "Content-Disposition", value: "inline" },
  { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
] as const;

const DEMO_STATIC_ASSET_HEADERS = [
  { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
] as const;

const GLB_DEMO_HEADERS = [
  { key: "Content-Type", value: "model/gltf-binary" },
  ...DEMO_STATIC_ASSET_HEADERS,
] as const;

const USDZ_RESTAURANT_HEADERS = [...USDZ_DEMO_HEADERS] as const;

const RESTAURANT_STATIC_ASSET_HEADERS = [
  { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
] as const;

const GLB_RESTAURANT_HEADERS = [
  { key: "Content-Type", value: "model/gltf-binary" },
  ...RESTAURANT_STATIC_ASSET_HEADERS,
] as const;

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  devIndicators: false,
  images: {
    qualities: [75, 90, 92],
  },
  async headers() {
    return [
      {
        source: "/models/demo/:path*.usdz",
        headers: [...USDZ_DEMO_HEADERS],
      },
      {
        source: "/models/demo/:path*.glb",
        headers: [...GLB_DEMO_HEADERS],
      },
      {
        source: "/models/restaurants/:path*.usdz",
        headers: [...USDZ_RESTAURANT_HEADERS],
      },
      {
        source: "/models/restaurants/:path*.glb",
        headers: [...GLB_RESTAURANT_HEADERS],
      },
      {
        source: "/models/restaurants/:path*.png",
        headers: [...RESTAURANT_STATIC_ASSET_HEADERS],
      },
      {
        source: "/models/restaurants/:path*.jpg",
        headers: [...RESTAURANT_STATIC_ASSET_HEADERS],
      },
      {
        source: "/models/restaurants/:path*.jpeg",
        headers: [...RESTAURANT_STATIC_ASSET_HEADERS],
      },
      {
        source: "/models/restaurants/:path*.webp",
        headers: [...RESTAURANT_STATIC_ASSET_HEADERS],
      },
      {
        source: "/models/restaurants/:path*.avif",
        headers: [...RESTAURANT_STATIC_ASSET_HEADERS],
      },
      {
        source: "/models/restaurants/:path*.svg",
        headers: [...RESTAURANT_STATIC_ASSET_HEADERS],
      },
      {
        source: "/images/demo/:path*",
        headers: [...DEMO_STATIC_ASSET_HEADERS],
      },
      {
        source: "/model-viewer/:path*.js",
        headers: [...DEMO_STATIC_ASSET_HEADERS],
      },
    ];
  },
};

export default nextConfig;
