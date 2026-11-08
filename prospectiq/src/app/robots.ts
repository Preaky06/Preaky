// Règles pour les robots : l'application, l'API et les rapports privés ne sont pas explorés.
import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  const base = env.appUrl.replace(/\/$/, '');
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/app', '/admin', '/api/', '/rapport/', '/invitation', '/reinitialiser'] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
