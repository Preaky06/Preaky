import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (base locale) charge des fichiers WebAssembly : on le laisse hors du bundle serveur.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
