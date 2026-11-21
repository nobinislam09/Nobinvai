import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileEdit,
  PenLine,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { BlogPost } from '../types/blog';
import { exportPostsToJson, formatEditorialDate, parseImportedPosts } from '../utils/blogHelpers';

interface AdminDashboardProps {
  posts: BlogPost[];
  storageError: string | null;
  onClearStorageError: () => void;
  onCreateNew: () => void;
  onEditPost: (id: string) => void;
  onReadPost: (slug: string) => void;
  onToggleStatus: (id: string) => void;
  onDuplicatePost: (id: string) => void;
  onDeletePost: (id: string) => void;
  onImportPosts: (incoming: BlogPost[], mode: 'merge' | 'replace') => boolean;
  onResetSamples: () => boolean;
}

type AdminStatusFilter = 'all' | 'published' | 'draft';

/**
 * Editorial Post Management & JSON Backup workspace accessible at /admin.
 */
export function AdminDashboard({
  posts,
  storageError,
  onClearStorageError,
  onCreateNew,
  onEditPost,
  onReadPost,
  onToggleStatus,
  onDuplicatePost,
  onDeletePost,
  onImportPosts,
  onResetSamples,
}: AdminDashboardProps) {
  const [statusFilter, setStatusFilter] = useState<AdminStatusFilter>('all');
  const [query, setQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const [pendingImport, setPendingImport] = useState<BlogPost[] | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const importInputRef = useRef<HTMLInputElement | null>(null);

  const stats = useMemo(() => {
    const published = posts.filter((p) => p.status === 'published').length;
    const drafts = posts.length - published;
    return { total: posts.length, published, drafts };
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...posts]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .filter((post) => {
        if (statusFilter !== 'all' && post.status !== statusFilter) return false;
        if (!q) return true;
        return (
          post.title.toLowerCase().includes(q) ||
          post.category.toLowerCase().includes(q) ||
          post.author.toLowerCase().includes(q) ||
          post.tags.some((t) => t.toLowerCase().includes(q))
        );
      });
  }, [posts, statusFilter, query]);

  const handleImportFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseImportedPosts(text);
      setPendingImport(parsed);
      setFeedback(null);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to parse the selected JSON file.',
      });
    }
  };

  const applyImport = (mode: 'merge' | 'replace') => {
    if (!pendingImport) return;
    const ok = onImportPosts(pendingImport, mode);
    if (ok) {
      setFeedback({
        type: 'success',
        text: `Imported ${pendingImport.length} post${pendingImport.length === 1 ? '' : 's'} (${mode === 'merge' ? 'merged with existing' : 'replaced library'}).`,
      });
    }
    setPendingImport(null);
  };

  const handleExport = () => {
    exportPostsToJson(posts);
    setFeedback({
      type: 'success',
      text: `Exported ${posts.length} post${posts.length === 1 ? '' : 's'} to JSON.`,
    });
  };

  const handleResetConfirm = () => {
    const ok = onResetSamples();
    setConfirmReset(false);
    if (ok) {
      setFeedback({
        type: 'success',
        text: 'Restored default sample technology articles.',
      });
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header Row */}
      <div className="flex flex-col gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-end sm:justify-between dark:border-[#242730]">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
            Post Management
          </h1>
          <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-400">
            Create, edit, publish, or back up your articles. Changes save automatically to browser local storage.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4 font-mono text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
            <span>{stats.total} total</span>
            <span aria-hidden="true">·</span>
            <span>{stats.published} published</span>
            <span aria-hidden="true">·</span>
            <span>{stats.drafts} drafts</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onCreateNew}
          className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" />
          <span>New Post</span>
        </button>
      </div>

      {/* Feedback / Storage Error Banners */}
      {storageError && (
        <div
          role="alert"
          className="mt-5 flex items-center justify-between rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
        >
          <span>{storageError}</span>
          <button
            type="button"
            onClick={onClearStorageError}
            aria-label="Dismiss storage error"
            className="rounded p-1 hover:bg-red-100 dark:hover:bg-red-900/40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {feedback && (
        <div
          role="status"
          className={`mt-5 flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
            feedback.type === 'error'
              ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200'
              : 'border-neutral-200 bg-white text-neutral-800 dark:border-[#242730] dark:bg-[#14161B] dark:text-neutral-200'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Dismiss notification"
            className="rounded p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Pending JSON Import Confirmation */}
      {pendingImport && (
        <div className="mt-5 flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50/70 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-blue-900/60 dark:bg-blue-950/30">
          <div className="text-sm text-neutral-900 dark:text-neutral-100">
            Ready to import{' '}
            <strong className="font-semibold tabular-nums">{pendingImport.length}</strong>{' '}
            post{pendingImport.length === 1 ? '' : 's'}. How would you like to apply them?
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => applyImport('merge')}
              className="min-h-[36px] rounded-lg bg-neutral-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Merge with existing
            </button>
            <button
              type="button"
              onClick={() => applyImport('replace')}
              className="min-h-[36px] rounded-lg border border-neutral-300 bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100 dark:border-[#242730] dark:bg-[#14161B] dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Replace all posts
            </button>
            <button
              type="button"
              onClick={() => setPendingImport(null)}
              className="min-h-[36px] px-2.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Toolbar: Filter + Search + JSON Export/Import */}
      <section className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-100/80 p-1 dark:border-[#242730] dark:bg-[#14161B]">
            {(['all', 'published', 'draft'] as AdminStatusFilter[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`min-h-[34px] rounded-md px-3 text-xs font-medium capitalize transition-colors ${
                  statusFilter === tab
                    ? 'bg-white text-neutral-950 shadow-xs dark:bg-[#232732] dark:text-neutral-50'
                    : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter posts..."
              aria-label="Filter managed posts"
              className="min-h-[40px] w-full rounded-lg border border-neutral-200 bg-white pl-8 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-700 focus:outline-none dark:border-[#242730] dark:bg-[#14161B] dark:text-neutral-100 dark:placeholder:text-neutral-500"
            />
          </div>
        </div>

        {/* Backup & Reset Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-[#242730] dark:bg-[#14161B] dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export JSON</span>
          </button>

          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-[#242730] dark:bg-[#14161B] dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import JSON</span>
          </button>

          {confirmReset ? (
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-neutral-100 px-2.5 py-1 dark:border-[#242730] dark:bg-[#14161B]">
              <span className="text-xs text-neutral-700 dark:text-neutral-300">Restore samples?</span>
              <button
                type="button"
                onClick={handleResetConfirm}
                className="text-xs font-semibold text-red-700 hover:underline dark:text-red-400"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:border-[#242730] dark:bg-[#14161B] dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Restore Samples</span>
            </button>
          )}
        </div>
      </section>

      {/* Post List */}
      <section className="mt-6 overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-[#242730] dark:bg-[#14161B]">
        {filteredPosts.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="font-serif text-lg font-medium text-neutral-900 dark:text-neutral-100">
              No posts found
            </p>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Create a new post or clear your filter to view all entries.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-[#242730]">
            {filteredPosts.map((post) => {
              const isDeleting = confirmDeleteId === post.id;
              return (
                <li
                  key={post.id}
                  className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-neutral-50/70 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-[#181B22]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 font-mono text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                      <span className="inline-flex items-center gap-1 font-sans font-medium text-neutral-800 dark:text-neutral-200">
                        {post.status === 'published' ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
                        ) : (
                          <FileEdit className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        )}
                        <span>{post.status === 'published' ? 'Published' : 'Draft'}</span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-sans">{post.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatEditorialDate(post.publishedAt)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{post.readingTimeMinutes} min read</span>
                      {post.featured && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-sans font-medium text-blue-700 dark:text-blue-400">
                            Featured
                          </span>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onEditPost(post.id)}
                      className="mt-1.5 block text-left font-serif text-lg font-semibold leading-snug text-neutral-950 hover:text-blue-700 dark:text-neutral-50 dark:hover:text-blue-400"
                    >
                      {post.title}
                    </button>

                    {post.excerpt && (
                      <p className="mt-1 line-clamp-1 text-sm text-neutral-600 dark:text-neutral-400">
                        {post.excerpt}
                      </p>
                    )}
                  </div>

                  {/* Row Actions */}
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onReadPost(post.slug)}
                      title="Read article"
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-[#242730] dark:bg-[#0C0D10] dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Read</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onEditPost(post.id)}
                      title="Edit post"
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-[#242730] dark:bg-[#0C0D10] dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      <PenLine className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleStatus(post.id)}
                      className="inline-flex min-h-[36px] items-center rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-[#242730] dark:bg-[#0C0D10] dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      {post.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>

                    <button
                      type="button"
                      onClick={() => onDuplicatePost(post.id)}
                      title="Duplicate as draft"
                      aria-label={`Duplicate ${post.title}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:border-[#242730] dark:bg-[#0C0D10] dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>

                    {isDeleting ? (
                      <div className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-2.5 py-1 dark:border-red-900/60 dark:bg-red-950/40">
                        <button
                          type="button"
                          onClick={() => {
                            onDeletePost(post.id);
                            setConfirmDeleteId(null);
                          }}
                          className="text-xs font-semibold text-red-700 hover:underline dark:text-red-300"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(post.id)}
                        title="Delete post"
                        aria-label={`Delete ${post.title}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-[#242730] dark:bg-[#0C0D10] dark:text-neutral-400 dark:hover:border-red-900/60 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
