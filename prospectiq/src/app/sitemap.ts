// Plan du site pour les moteurs de recherche (pages publiques uniquement).
import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.appUrl.replace(/\/$/, '');
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/outils/audit-site`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/confiance`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/inscription`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/confidentialite`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/cgu`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/mentions-legales`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/opposition`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
