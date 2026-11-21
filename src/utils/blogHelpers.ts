import { BLOG_CATEGORIES, BlogCategory, BlogPost } from '../types/blog';

/**
 * Generates a URL-safe slug from a post title.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['’"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled-post';
}

/**
 * Estimates reading time in minutes at ~220 words per minute,
 * stripping fenced code punctuation and markdown symbols so code-heavy tutorials remain accurate.
 */
export function calculateReadingTime(markdown: string): number {
  const plainText = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // strip image markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // keep link text
    .replace(/[`#>*_\-|]/g, ' ')
    .trim();

  if (!plainText) return 1;
  const words = plainText.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

/**
 * Formats a YYYY-MM-DD date string into a concise editorial date (e.g., "Nov 18, 2026").
 */
export function formatEditorialDate(dateStr: string): string {
  if (!dateStr) return 'Unscheduled';
  // Parse YYYY-MM-DD explicitly in UTC to avoid off-by-one timezone shifts
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month, day));
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Returns today's date formatted as YYYY-MM-DD in local time.
 */
export function getTodayDateInput(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Validates and sanitizes URLs used for links and images.
 * Allows http:, https:, mailto:, relative paths (/), and base64 data:image/* strings.
 */
export function sanitizeUrl(url: string, allowDataImage = false): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('/')) return trimmed;
  if (allowDataImage && /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,/i.test(trimmed)) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:') {
      return trimmed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Reads a user-selected image file and compresses/resizes it into a compact Data URL
 * so uploaded cover & inline images persist reliably inside localStorage.
 */
export async function readAndOptimizeImageFile(
  file: File,
  maxWidth = 1400,
  quality = 0.82
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file (PNG, JPEG, WebP, or SVG).');
  }

  // Keep small SVGs verbatim
  if (file.type === 'image/svg+xml') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to read SVG file.'));
      reader.readAsDataURL(file);
    });
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let targetWidth = img.naturalWidth;
      let targetHeight = img.naturalHeight;

      if (targetWidth > maxWidth) {
        const ratio = maxWidth / targetWidth;
        targetWidth = maxWidth;
        targetHeight = Math.round(targetHeight * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(rawDataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const compressed = canvas.toDataURL(outputMime, quality);
      // Only use compressed version if it actually saved space
      resolve(compressed.length < rawDataUrl.length ? compressed : rawDataUrl);
    };
    img.onerror = () => reject(new Error('Could not decode the selected image.'));
    img.src = rawDataUrl;
  });
}

/**
 * Triggers a clean browser download of all blog posts as formatted JSON.
 */
export function exportPostsToJson(posts: BlogPost[]): void {
  const payload = {
    publication: 'Signal & Craft',
    exportedAt: new Date().toISOString(),
    version: 1,
    posts,
  };
  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `signal-and-craft-posts-${getTodayDateInput()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parses and validates an imported JSON file into normalized BlogPost records.
 * Supports either `{ posts: [...] }` export bundles or a plain array `[...]`.
 */
export function parseImportedPosts(rawJson: string): BlogPost[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('The selected file does not contain valid JSON.');
  }

  const candidateArray = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { posts?: unknown[] }).posts)
      ? (parsed as { posts: unknown[] }).posts
      : null;

  if (!candidateArray || candidateArray.length === 0) {
    throw new Error('No posts array found in the imported JSON file.');
  }

  const validCategorySet = new Set<string>(BLOG_CATEGORIES);

  return candidateArray.map((item, idx) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Post entry at index ${idx} is malformed.`);
    }
    const record = item as Record<string, unknown>;
    const title = typeof record.title === 'string' && record.title.trim() ? record.title.trim() : `Imported Post ${idx + 1}`;
    const content = typeof record.content === 'string' ? record.content : '';
    const category: BlogCategory =
      typeof record.category === 'string' && validCategorySet.has(record.category)
        ? (record.category as BlogCategory)
        : 'Software';

    const tags = Array.isArray(record.tags)
      ? record.tags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0).map((t) => t.trim())
      : [];

    return {
      id: typeof record.id === 'string' && record.id.trim() ? record.id : `post-${Date.now()}-${idx}`,
      slug: typeof record.slug === 'string' && record.slug.trim() ? slugify(record.slug) : slugify(title),
      title,
      excerpt: typeof record.excerpt === 'string' ? record.excerpt : '',
      content,
      category,
      tags,
      coverImage: typeof record.coverImage === 'string' ? record.coverImage : '',
      coverCaption: typeof record.coverCaption === 'string' ? record.coverCaption : undefined,
      author: typeof record.author === 'string' && record.author.trim() ? record.author.trim() : 'Editorial Desk',
      publishedAt: typeof record.publishedAt === 'string' && record.publishedAt ? record.publishedAt : getTodayDateInput(),
      updatedAt: typeof record.updatedAt === 'string' && record.updatedAt ? record.updatedAt : new Date().toISOString(),
      status: record.status === 'draft' ? 'draft' : 'published',
      featured: Boolean(record.featured),
      readingTimeMinutes:
        typeof record.readingTimeMinutes === 'number' && record.readingTimeMinutes > 0
          ? record.readingTimeMinutes
          : calculateReadingTime(content),
    };
  });
}
