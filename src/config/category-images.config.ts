// Base URL for static assets - uses environment variable or falls back to relative path
const getBaseUrl = (): string => {
  return process.env.APP_URL || '';
};

// Category image paths (served from public/categories/)
export const CATEGORY_IMAGES: Record<string, string[]> = {
  'fast-food': [`${getBaseUrl()}/categories/fast-food.jpg`],
  'bakery': [`${getBaseUrl()}/categories/bakery.jpg`],
  'desserts': [`${getBaseUrl()}/categories/desserts.jpg`],
  'traditional': [`${getBaseUrl()}/categories/traditional.jpg`],
  'salad': [`${getBaseUrl()}/categories/salad.jpg`],
  'default': [`${getBaseUrl()}/categories/bakery.jpg`],
};

export const DEFAULT_CATEGORY_IMAGES = CATEGORY_IMAGES['default'];

export const getImagesForCategory = (slug: string): string[] => {
  // Re-compute to get fresh env value
  const baseUrl = process.env.APP_URL || '';
  const path = `/categories/${slug}.jpg`;

  if (CATEGORY_IMAGES[slug]) {
    return [`${baseUrl}${path}`];
  }
  return [`${baseUrl}/categories/bakery.jpg`];
};
