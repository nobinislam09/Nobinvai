/**
 * Core domain types for Signal & Craft technology blog.
 */

export const BLOG_CATEGORIES = [
  'AI & Tools',
  'Software',
  'Gadgets',
  'Tutorials',
  'Guides',
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export type PostStatus = 'published' | 'draft';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: BlogCategory;
  tags: string[];
  coverImage: string;
  coverCaption?: string;
  author: string;
  publishedAt: string; // YYYY-MM-DD
  updatedAt: string; // ISO string
  status: PostStatus;
  featured: boolean;
  readingTimeMinutes: number;
}

export type PostDraftInput = Omit<BlogPost, 'id' | 'updatedAt' | 'readingTimeMinutes'>;
