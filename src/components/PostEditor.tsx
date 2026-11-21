import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bold,
  Code,
  Columns2,
  Eye,
  Heading2,
  Heading3,
  ImagePlus,
  Info,
  Italic,
  PenLine,
  Quote,
  Save,
  Upload,
  X,
} from 'lucide-react';
import { BLOG_CATEGORIES, BlogCategory, BlogPost, PostDraftInput, PostStatus } from '../types/blog';
import {
  calculateReadingTime,
  getTodayDateInput,
  readAndOptimizeImageFile,
  slugify,
} from '../utils/blogHelpers';
import { ArticleRenderer } from './ArticleRenderer';
import { ResilientImage } from './ResilientImage';

interface PostEditorProps {
  initialPost?: BlogPost;
  onSave: (input: PostDraftInput, existingId?: string) => { ok: boolean; post?: BlogPost; error?: string };
  onCancel: () => void;
}

type EditorViewMode = 'write' | 'split' | 'preview';

/**
 * Full-featured Markdown blog post editor with cover/inline image upload,
 * cursor-aware formatting toolbar, tag editor, and live preview.
 */
export function PostEditor({ initialPost, onSave, onCancel }: PostEditorProps) {
  const isEditing = Boolean(initialPost);

  const [title, setTitle] = useState(initialPost?.title ?? '');
  const [slug, setSlug] = useState(initialPost?.slug ?? '');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(Boolean(initialPost));
  const [excerpt, setExcerpt] = useState(initialPost?.excerpt ?? '');
  const [content, setContent] = useState(initialPost?.content ?? '');
  const [category, setCategory] = useState<BlogCategory>(initialPost?.category ?? 'Software');
  const [tags, setTags] = useState<string[]>(initialPost?.tags ?? []);
  const [tagDraft, setTagDraft] = useState('');
  const [author, setAuthor] = useState(initialPost?.author ?? 'Editorial Desk');
  const [publishedAt, setPublishedAt] = useState(initialPost?.publishedAt ?? getTodayDateInput());
  const [status, setStatus] = useState<PostStatus>(initialPost?.status ?? 'published');
  const [featured, setFeatured] = useState<boolean>(initialPost?.featured ?? false);
  const [coverImage, setCoverImage] = useState(initialPost?.coverImage ?? '');
  const [coverCaption, setCoverCaption] = useState(initialPost?.coverCaption ?? '');

  const [viewMode, setViewMode] = useState<EditorViewMode>('write');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Inline image insertion drawer state
  const [showInlineImageDrawer, setShowInlineImageDrawer] = useState(false);
  const [inlineImgUrl, setInlineImgUrl] = useState('');
  const [inlineImgCaption, setInlineImgCaption] = useState('');
  const [uploadingInlineImg, setUploadingInlineImg] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const inlineFileInputRef = useRef<HTMLInputElement | null>(null);

  const wordCount = useMemo(() => {
    const trimmed = content.trim();
    return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  }, [content]);

  const readingTimeMinutes = useMemo(() => calculateReadingTime(content), [content]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugManuallyEdited) {
      setSlug(slugify(value));
    }
  };

  const handleAddTag = (raw: string) => {
    const cleaned = raw.trim().replace(/^#/, '');
    if (!cleaned) return;
    if (!tags.some((t) => t.toLowerCase() === cleaned.toLowerCase())) {
      setTags((prev) => [...prev, cleaned]);
    }
    setTagDraft('');
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(tagDraft);
    } else if (e.key === 'Backspace' && !tagDraft && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingCover(true);
    setErrorMsg(null);
    try {
      const dataUrl = await readAndOptimizeImageFile(file);
      setCoverImage(dataUrl);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to process cover image.');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleInlineUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingInlineImg(true);
    setErrorMsg(null);
    try {
      const dataUrl = await readAndOptimizeImageFile(file, 1200, 0.8);
      setInlineImgUrl(dataUrl);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to process inline image.');
    } finally {
      setUploadingInlineImg(false);
    }
  };

  const insertAroundSelection = (before: string, after = '', placeholder = '') => {
    const el = textareaRef.current;
    if (!el) {
      setContent((prev) => `${prev}${prev ? '\n\n' : ''}${before}${placeholder}${after}`);
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end) || placeholder;
    const nextContent = content.slice(0, start) + before + selected + after + content.slice(end);
    setContent(nextContent);

    requestAnimationFrame(() => {
      el.focus();
      const cursorPos = start + before.length + selected.length;
      el.setSelectionRange(cursorPos, cursorPos);
    });
  };

  const handleInsertInlineImage = () => {
    if (!inlineImgUrl.trim()) {
      setErrorMsg('Please enter an image URL or upload an image file before inserting.');
      return;
    }
    const caption = inlineImgCaption.trim() || 'Article illustration';
    const markdownSnippet = `\n\n![${caption}](${inlineImgUrl.trim()})\n\n`;
    insertAroundSelection(markdownSnippet, '', '');
    setInlineImgUrl('');
    setInlineImgCaption('');
    setShowInlineImageDrawer(false);
    setErrorMsg(null);
  };

  const submitWithStatus = (targetStatus: PostStatus) => {
    if (!title.trim()) {
      setErrorMsg('Please enter an article title before saving.');
      return;
    }
    if (!content.trim()) {
      setErrorMsg('Please write some article content before saving.');
      return;
    }

    setErrorMsg(null);
    const payload: PostDraftInput = {
      title: title.trim(),
      slug: slugify(slug || title),
      excerpt: excerpt.trim() || content.trim().slice(0, 160).replace(/\n+/g, ' '),
      content: content.trim(),
      category,
      tags,
      coverImage: coverImage.trim(),
      coverCaption: coverCaption.trim() || undefined,
      author: author.trim() || 'Editorial Desk',
      publishedAt: publishedAt || getTodayDateInput(),
      status: targetStatus,
      featured,
    };

    const result = onSave(payload, initialPost?.id);
    if (!result.ok && result.error) {
      setErrorMsg(result.error);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Action Bar */}
      <div className="flex flex-col gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-center sm:justify-between dark:border-[#242730]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-[#242730] dark:bg-[#14161B] dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
          <div>
            <h1 className="font-serif text-xl font-semibold text-neutral-950 sm:text-2xl dark:text-neutral-50">
              {isEditing ? 'Edit Post' : 'New Post'}
            </h1>
            <p className="font-mono text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
              {wordCount} words · {readingTimeMinutes} min read
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Switch */}
          <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-100/80 p-1 dark:border-[#242730] dark:bg-[#14161B]">
            <button
              type="button"
              onClick={() => setViewMode('write')}
              className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors ${
                viewMode === 'write'
                  ? 'bg-white text-neutral-950 shadow-xs dark:bg-[#232732] dark:text-neutral-50'
                  : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100'
              }`}
            >
              <PenLine className="h-3.5 w-3.5" />
              <span>Write</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`hidden min-h-[34px] items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors lg:inline-flex ${
                viewMode === 'split'
                  ? 'bg-white text-neutral-950 shadow-xs dark:bg-[#232732] dark:text-neutral-50'
                  : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100'
              }`}
            >
              <Columns2 className="h-3.5 w-3.5" />
              <span>Split</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors ${
                viewMode === 'preview'
                  ? 'bg-white text-neutral-950 shadow-xs dark:bg-[#232732] dark:text-neutral-50'
                  : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Preview</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => submitWithStatus('draft')}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-100 dark:border-[#242730] dark:bg-[#14161B] dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => submitWithStatus(status === 'draft' && isEditing ? 'published' : status)}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            <span>{isEditing ? (status === 'draft' ? 'Publish Post' : 'Save Changes') : 'Publish Post'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="mt-5 flex items-center justify-between rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
        >
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            aria-label="Dismiss error"
            className="rounded p-1 hover:bg-red-100 dark:hover:bg-red-900/40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Metadata Form Grid */}
      <section className="mt-6 grid grid-cols-1 gap-6 rounded-lg border border-neutral-200 bg-white p-5 sm:p-6 lg:grid-cols-12 dark:border-[#242730] dark:bg-[#14161B]">
        <div className="space-y-4 lg:col-span-8">
          <div>
            <label htmlFor="post-title" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Post Title
            </label>
            <input
              id="post-title"
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g., Designing Deterministic Caching Layers for Modern Web Apps"
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2 font-serif text-lg font-medium text-neutral-950 placeholder:text-neutral-400 focus:border-blue-700 focus:bg-white focus:outline-none dark:border-[#242730] dark:bg-[#0C0D10] dark:text-neutral-50 dark:placeholder:text-neutral-500 dark:focus:border-blue-400"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="post-slug" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                URL Slug
              </label>
              <input
                id="post-slug"
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlugManuallyEdited(true);
                  setSlug(e.target.value);
                }}
                placeholder="designing-deterministic-caching-layers"
                className="mt-1.5 min-h-[40px] w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 font-mono text-xs text-neutral-800 placeholder:text-neutral-400 focus:border-blue-700 focus:bg-white focus:outline-none dark:border-[#242730] dark:bg-[#0C0D10] dark:text-neutral-200 dark:focus:border-blue-400"
              />
            </div>

            <div>
              <label htmlFor="post-author" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Author
              </label>
              <input
                id="post-author"
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Your name"
                className="mt-1.5 min-h-[40px] w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-700 focus:bg-white focus:outline-none dark:border-[#242730] dark:bg-[#0C0D10] dark:text-neutral-100 dark:focus:border-blue-400"
              />
            </div>
          </div>

          <div>
            <label htmlFor="post-excerpt" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Summary / Excerpt
            </label>
            <textarea
              id="post-excerpt"
              rows={2}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="A concise 1–2 sentence overview displayed on the homepage and article header..."
              className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-sm leading-relaxed text-neutral-900 placeholder:text-neutral-400 focus:border-blue-700 focus:bg-white focus:outline-none dark:border-[#242730] dark:bg-[#0C0D10] dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-blue-400"
            />
          </div>

          {/* Category, Date, Status, Featured */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="post-category" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Category
              </label>
              <select
                id="post-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as BlogCategory)}
                className="mt-1.5 min-h-[40px] w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm text-neutral-900 focus:border-blue-700 focus:bg-white focus:outline-none dark:border-[#242730] dark:bg-[#0C0D10] dark:text-neutral-100 dark:focus:border-blue-400"
              >
                {BLOG_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="post-date" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Publish Date
              </label>
              <input
                id="post-date"
                type="date"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                className="mt-1.5 min-h-[40px] w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 font-mono text-xs text-neutral-900 focus:border-blue-700 focus:bg-white focus:outline-none dark:border-[#242730] dark:bg-[#0C0D10] dark:text-neutral-100 dark:focus:border-blue-400"
              />
            </div>

            <div>
              <label htmlFor="post-status" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Visibility
              </label>
              <select
                id="post-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as PostStatus)}
                className="mt-1.5 min-h-[40px] w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm text-neutral-900 focus:border-blue-700 focus:bg-white focus:outline-none dark:border-[#242730] dark:bg-[#0C0D10] dark:text-neutral-100 dark:focus:border-blue-400"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          {/* Tags & Featured Toggle */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1">
              <label htmlFor="post-tags" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Tags (press Enter or comma to add)
              </label>
              <div className="mt-1.5 flex min-h-[42px] flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 focus-within:border-blue-700 focus-within:bg-white dark:border-[#242730] dark:bg-[#0C0D10] dark:focus-within:border-blue-400">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded bg-neutral-200/80 px-2 py-0.5 text-xs font-medium text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                      aria-label={`Remove tag ${tag}`}
                      className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  id="post-tags"
                  type="text"
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => {
                    if (tagDraft.trim()) handleAddTag(tagDraft);
                  }}
                  placeholder={tags.length === 0 ? 'TypeScript, Architecture, Hardware...' : 'Add tag...'}
                  className="min-w-[140px] flex-1 bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-100 dark:placeholder:text-neutral-500"
                />
              </div>
            </div>

            <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-blue-700 focus:ring-blue-700 dark:border-neutral-600 dark:bg-neutral-900"
              />
              <span>Feature on homepage</span>
            </label>
          </div>
        </div>

        {/* Cover Image Column */}
        <div className="space-y-3 border-t border-neutral-200 pt-5 lg:col-span-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0 dark:border-[#242730]">
          <div className="flex items-center justify-between">
            <label htmlFor="post-cover-url" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Cover Image
            </label>
            {coverImage && (
              <button
                type="button"
                onClick={() => setCoverImage('')}
                className="text-xs font-medium text-neutral-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400"
              >
                Remove image
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-[#242730] dark:bg-[#0C0D10]">
            <ResilientImage
              src={coverImage}
              alt={title || 'Cover preview'}
              fallbackLabel="No cover image selected"
              className="aspect-video w-full object-cover"
              aspectClassName="aspect-video"
            />
          </div>

          <div className="flex gap-2">
            <input
              id="post-cover-url"
              type="text"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="Paste image URL or upload..."
              className="min-h-[38px] flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-400 focus:border-blue-700 focus:bg-white focus:outline-none dark:border-[#242730] dark:bg-[#0C0D10] dark:text-neutral-200 dark:focus:border-blue-400"
            />
            <input
              ref={coverFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => coverFileInputRef.current?.click()}
              disabled={uploadingCover}
              className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-[#242730] dark:bg-[#0C0D10] dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>{uploadingCover ? 'Loading...' : 'Upload'}</span>
            </button>
          </div>

          <div>
            <label htmlFor="post-cover-caption" className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Cover Caption (optional)
            </label>
            <input
              id="post-cover-caption"
              type="text"
              value={coverCaption}
              onChange={(e) => setCoverCaption(e.target.value)}
              placeholder="Brief image credit or caption..."
              className="mt-1 min-h-[36px] w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-800 placeholder:text-neutral-400 focus:border-blue-700 focus:bg-white focus:outline-none dark:border-[#242730] dark:bg-[#0C0D10] dark:text-neutral-200 dark:focus:border-blue-400"
            />
          </div>
        </div>
      </section>

      {/* Content Editor & Preview */}
      <section className="mt-6">
        <div
          className={`grid gap-6 ${
            viewMode === 'split' ? 'lg:grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {/* Write Pane */}
          {viewMode !== 'preview' && (
            <div className="flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-[#242730] dark:bg-[#14161B]">
              {/* Formatting Toolbar */}
              <div className="flex flex-wrap items-center gap-1 border-b border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-[#242730] dark:bg-[#0C0D10]">
                <ToolbarButton
                  label="Heading 2"
                  onClick={() => insertAroundSelection('\n## ', '\n', 'Section Heading')}
                >
                  <Heading2 className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  label="Heading 3"
                  onClick={() => insertAroundSelection('\n### ', '\n', 'Subheading')}
                >
                  <Heading3 className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  label="Bold"
                  onClick={() => insertAroundSelection('**', '**', 'bold text')}
                >
                  <Bold className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  label="Italic"
                  onClick={() => insertAroundSelection('*', '*', 'italic text')}
                >
                  <Italic className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  label="Code block"
                  onClick={() =>
                    insertAroundSelection('\n```typescript\n', '\n```\n', '// Your code snippet')
                  }
                >
                  <Code className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  label="Pull quote"
                  onClick={() => insertAroundSelection('\n> ', '\n', 'Key takeaway quote')}
                >
                  <Quote className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  label="Callout note"
                  onClick={() =>
                    insertAroundSelection('\n> [!NOTE]\n> ', '\n', 'Important context for readers.')
                  }
                >
                  <Info className="h-4 w-4" />
                </ToolbarButton>

                <div className="mx-1 h-4 w-px bg-neutral-200 dark:bg-[#242730]" />

                <button
                  type="button"
                  onClick={() => setShowInlineImageDrawer((v) => !v)}
                  className={`inline-flex min-h-[34px] items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors ${
                    showInlineImageDrawer
                      ? 'bg-blue-700 text-white dark:bg-blue-600'
                      : 'text-neutral-700 hover:bg-neutral-200/70 dark:text-neutral-300 dark:hover:bg-neutral-800'
                  }`}
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  <span>Insert Image</span>
                </button>
              </div>

              {/* Inline Image Insertion Drawer */}
              {showInlineImageDrawer && (
                <div className="border-b border-neutral-200 bg-neutral-50/90 p-4 dark:border-[#242730] dark:bg-[#101217]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                      Insert Inline Article Image
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowInlineImageDrawer(false)}
                      aria-label="Close inline image drawer"
                      className="rounded p-1 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inlineImgUrl}
                        onChange={(e) => setInlineImgUrl(e.target.value)}
                        placeholder="Paste image URL or upload file..."
                        className="min-h-[38px] flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-blue-700 focus:outline-none dark:border-[#242730] dark:bg-[#0C0D10] dark:text-neutral-100"
                      />
                      <input
                        ref={inlineFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleInlineUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => inlineFileInputRef.current?.click()}
                        disabled={uploadingInlineImg}
                        className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-[#242730] dark:bg-[#14161B] dark:text-neutral-300 dark:hover:bg-neutral-800"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>{uploadingInlineImg ? 'Loading...' : 'Upload'}</span>
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inlineImgCaption}
                        onChange={(e) => setInlineImgCaption(e.target.value)}
                        placeholder="Figure caption / alt text..."
                        className="min-h-[38px] flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-blue-700 focus:outline-none dark:border-[#242730] dark:bg-[#0C0D10] dark:text-neutral-100"
                      />
                      <button
                        type="button"
                        onClick={handleInsertInlineImage}
                        className="min-h-[38px] shrink-0 rounded-lg bg-neutral-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                      >
                        Insert
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={22}
                placeholder={`Write your essay in clean Markdown...\n\n## Section Heading\n\nOpening paragraph with **bold emphasis**, *italics*, and \`inline code\`.\n\n> [!TIP]\n> Callouts highlight practical engineering takeaways.\n\n![Caption for figure](https://...)`}
                aria-label="Article Markdown content"
                className="min-h-[520px] w-full flex-1 resize-y bg-white p-5 font-mono text-[13.5px] leading-relaxed text-neutral-900 placeholder:text-neutral-400 focus:outline-none dark:bg-[#14161B] dark:text-neutral-100 dark:placeholder:text-neutral-500"
              />
            </div>
          )}

          {/* Live Preview Pane */}
          {viewMode !== 'write' && (
            <div className="rounded-lg border border-neutral-200 bg-white p-6 sm:p-8 dark:border-[#242730] dark:bg-[#14161B]">
              <div className="mb-6 border-b border-neutral-200 pb-4 dark:border-[#242730]">
                <div className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="font-sans font-medium text-blue-700 dark:text-blue-400">
                    {category}
                  </span>{' '}
                  · {readingTimeMinutes} min read
                </div>
                <h2 className="mt-2 font-serif text-2xl font-semibold text-neutral-950 sm:text-3xl dark:text-neutral-50">
                  {title || 'Untitled Article'}
                </h2>
                {excerpt && (
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                    {excerpt}
                  </p>
                )}
              </div>

              <div className="max-w-[68ch]">
                <ArticleRenderer content={content} enableDropCap />
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded text-neutral-700 transition-colors hover:bg-neutral-200/70 hover:text-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
    >
      {children}
    </button>
  );
}
