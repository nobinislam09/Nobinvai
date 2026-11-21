import { useCallback, useState } from 'react';
import { SAMPLE_POSTS } from '../data/samplePosts';
import { BlogPost, PostDraftInput } from '../types/blog';
import { calculateReadingTime, slugify } from '../utils/blogHelpers';

const POSTS_STORAGE_KEY = 'signal_craft_posts_v1';

function loadInitialPosts(): BlogPost[] {
  if (typeof window === 'undefined') return SAMPLE_POSTS;
  try {
    const raw = window.localStorage.getItem(POSTS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(SAMPLE_POSTS));
      return SAMPLE_POSTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Fall back safely to sample posts if storage is corrupted
  }
  return SAMPLE_POSTS;
}

function ensureUniqueSlug(desiredSlug: string, existingPosts: BlogPost[], ignoreId?: string): string {
  const base = slugify(desiredSlug);
  const taken = new Set(
    existingPosts.filter((p) => p.id !== ignoreId).map((p) => p.slug)
  );
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}

/**
 * Central state store for blog posts with localStorage persistence and JSON import/export support.
 */
export function useBlogStore() {
  const [posts, setPosts] = useState<BlogPost[]>(loadInitialPosts);
  const [storageError, setStorageError] = useState<string | null>(null);

  const persistPosts = useCallback((nextPosts: BlogPost[]): boolean => {
    try {
      window.localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(nextPosts));
      setStorageError(null);
      setPosts(nextPosts);
      return true;
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'QuotaExceededError'
          ? 'Browser local storage limit reached. Try using smaller images or image URLs, and export a JSON backup.'
          : 'Unable to save posts to local storage.';
      setStorageError(message);
      return false;
    }
  }, []);

  const createPost = useCallback(
    (input: PostDraftInput): { ok: boolean; post?: BlogPost; error?: string } => {
      const now = new Date().toISOString();
      const id = `post-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const uniqueSlug = ensureUniqueSlug(input.slug || input.title, posts);

      const newPost: BlogPost = {
        ...input,
        id,
        slug: uniqueSlug,
        updatedAt: now,
        readingTimeMinutes: calculateReadingTime(input.content),
      };

      const nextPosts = [newPost, ...posts];
      const saved = persistPosts(nextPosts);
      return saved ? { ok: true, post: newPost } : { ok: false, error: storageError ?? 'Storage write failed.' };
    },
    [posts, persistPosts, storageError]
  );

  const updatePost = useCallback(
    (id: string, input: PostDraftInput): { ok: boolean; post?: BlogPost; error?: string } => {
      const targetExists = posts.some((p) => p.id === id);
      if (!targetExists) {
        return { ok: false, error: 'Post could not be found.' };
      }

      const uniqueSlug = ensureUniqueSlug(input.slug || input.title, posts, id);
      let updatedPost: BlogPost | undefined;

      const nextPosts = posts.map((post) => {
        if (post.id !== id) return post;
        updatedPost = {
          ...post,
          ...input,
          id,
          slug: uniqueSlug,
          updatedAt: new Date().toISOString(),
          readingTimeMinutes: calculateReadingTime(input.content),
        };
        return updatedPost;
      });

      const saved = persistPosts(nextPosts);
      return saved ? { ok: true, post: updatedPost } : { ok: false, error: storageError ?? 'Storage write failed.' };
    },
    [posts, persistPosts, storageError]
  );

  const deletePost = useCallback(
    (id: string): boolean => {
      const nextPosts = posts.filter((p) => p.id !== id);
      return persistPosts(nextPosts);
    },
    [posts, persistPosts]
  );

  const togglePostStatus = useCallback(
    (id: string): boolean => {
      const nextPosts = posts.map((post) => {
        if (post.id !== id) return post;
        return {
          ...post,
          status: post.status === 'published' ? ('draft' as const) : ('published' as const),
          updatedAt: new Date().toISOString(),
        };
      });
      return persistPosts(nextPosts);
    },
    [posts, persistPosts]
  );

  const duplicatePost = useCallback(
    (id: string): BlogPost | null => {
      const source = posts.find((p) => p.id === id);
      if (!source) return null;
      const copyTitle = `${source.title} (Copy)`;
      const newPost: BlogPost = {
        ...source,
        id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: copyTitle,
        slug: ensureUniqueSlug(`${source.slug}-copy`, posts),
        status: 'draft',
        featured: false,
        updatedAt: new Date().toISOString(),
      };
      const ok = persistPosts([newPost, ...posts]);
      return ok ? newPost : null;
    },
    [posts, persistPosts]
  );

  const importPosts = useCallback(
    (incoming: BlogPost[], mode: 'merge' | 'replace'): boolean => {
      if (mode === 'replace') {
        return persistPosts(incoming);
      }
      const byId = new Map(posts.map((p) => [p.id, p]));
      for (const item of incoming) {
        const existingWithSameSlug = posts.find((p) => p.slug === item.slug && p.id !== item.id);
        const safeItem = existingWithSameSlug
          ? { ...item, slug: ensureUniqueSlug(item.slug, posts, item.id) }
          : item;
        byId.set(safeItem.id, safeItem);
      }
      const merged = Array.from(byId.values()).sort((a, b) =>
        b.publishedAt.localeCompare(a.publishedAt)
      );
      return persistPosts(merged);
    },
    [posts, persistPosts]
  );

  const resetToSamplePosts = useCallback((): boolean => {
    return persistPosts(SAMPLE_POSTS);
  }, [persistPosts]);

  return {
    posts,
    storageError,
    clearStorageError: () => setStorageError(null),
    createPost,
    updatePost,
    deletePost,
    togglePostStatus,
    duplicatePost,
    importPosts,
    resetToSamplePosts,
  };
}
