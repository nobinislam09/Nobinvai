import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, PenLine } from 'lucide-react';
import { BlogCategory, BlogPost } from '../types/blog';
import { formatEditorialDate } from '../utils/blogHelpers';
import { ArticleRenderer } from './ArticleRenderer';
import { ResilientImage } from './ResilientImage';

interface ArticleViewProps {
  post: BlogPost;
  previousPost: BlogPost | null;
  nextPost: BlogPost | null;
  onBackHome: () => void;
  onOpenPost: (slug: string) => void;
  onEditPost: (id: string) => void;
  onFilterByCategory: (category: BlogCategory) => void;
  onFilterByTag: (tag: string) => void;
}

/**
 * Long-form article reading view optimized for readability, comfortable line-height,
 * optimal prose measure (~68ch), and clean next/previous navigation.
 */
export function ArticleView({
  post,
  previousPost,
  nextPost,
  onBackHome,
  onOpenPost,
  onEditPost,
  onFilterByCategory,
  onFilterByTag,
}: ArticleViewProps) {
  const [readProgress, setReadProgress] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [post.id]);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) {
        setReadProgress(1);
        return;
      }
      const ratio = Math.min(1, Math.max(0, scrollTop / docHeight));
      setReadProgress(ratio);
    };

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [post.id]);

  return (
    <article className="relative">
      {/* Hairline Reading Depth Progress Bar (compositor scaleX) */}
      <div
        aria-hidden="true"
        className="fixed left-0 top-0 z-40 h-[2.5px] w-full origin-left bg-blue-700 transition-transform duration-75 dark:bg-blue-400"
        style={{ transform: `scaleX(${readProgress})` }}
      />

      <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        {/* Breadcrumb & Author Quick-Edit Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4 dark:border-[#242730]">
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex min-h-[40px] items-center gap-2 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>All articles</span>
          </button>

          <div className="flex items-center gap-4">
            {post.status === 'draft' && (
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                Draft preview
              </span>
            )}
            <button
              type="button"
              onClick={() => onEditPost(post.id)}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-950 dark:border-[#242730] dark:bg-[#14161B] dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            >
              <PenLine className="h-3.5 w-3.5" />
              <span>Edit article</span>
            </button>
          </div>
        </div>

        {/* Article Header */}
        <header className="mx-auto mt-10 max-w-[68ch]">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
            <button
              type="button"
              onClick={() => onFilterByCategory(post.category)}
              className="font-sans font-semibold text-blue-700 hover:underline dark:text-blue-400"
            >
              {post.category}
            </button>
            <span aria-hidden="true">·</span>
            <time dateTime={post.publishedAt}>{formatEditorialDate(post.publishedAt)}</time>
            <span aria-hidden="true">·</span>
            <span>{post.readingTimeMinutes} min read</span>
          </div>

          <h1 className="mt-4 font-serif text-3xl font-semibold leading-[1.15] tracking-tight text-neutral-950 [text-wrap:balance] sm:text-4xl lg:text-[2.65rem] dark:text-neutral-50">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="mt-5 text-lg leading-relaxed text-neutral-600 sm:text-xl dark:text-neutral-400">
              {post.excerpt}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-neutral-200 pt-4 text-sm dark:border-[#242730]">
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              By {post.author}
            </span>

            {post.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                <span>Topics:</span>
                {post.tags.map((tag, idx) => (
                  <span key={tag} className="inline-flex items-center gap-2">
                    {idx > 0 && <span aria-hidden="true">·</span>}
                    <button
                      type="button"
                      onClick={() => onFilterByTag(tag)}
                      className="font-medium text-neutral-700 hover:text-blue-700 hover:underline dark:text-neutral-300 dark:hover:text-blue-400"
                    >
                      {tag}
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Cover Image */}
        {post.coverImage && (
          <figure className="mt-9">
            <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-[#242730] dark:bg-[#14161B]">
              <ResilientImage
                src={post.coverImage}
                alt={post.title}
                fallbackLabel={post.category}
                className="aspect-video w-full object-cover"
                aspectClassName="aspect-video"
              />
            </div>
            {post.coverCaption && (
              <figcaption className="mx-auto mt-2.5 max-w-[68ch] text-xs italic text-neutral-500 dark:text-neutral-400">
                {post.coverCaption}
              </figcaption>
            )}
          </figure>
        )}

        {/* Long-Form Reading Column (~68ch optimal measure) */}
        <div className="mx-auto mt-10 max-w-[68ch]">
          <ArticleRenderer content={post.content} enableDropCap />
        </div>

        {/* Next / Previous Post Navigation */}
        {(previousPost || nextPost) && (
          <nav
            aria-label="Adjacent articles"
            className="mx-auto mt-16 max-w-[68ch] border-t border-neutral-200 pt-10 dark:border-[#242730]"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {previousPost ? (
                <button
                  type="button"
                  onClick={() => onOpenPost(previousPost.slug)}
                  className="group flex flex-col items-start rounded-lg border border-neutral-200 bg-white p-5 text-left transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-[#242730] dark:bg-[#14161B] dark:hover:border-neutral-700 dark:hover:bg-[#191C22]"
                >
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Previous article</span>
                  </span>
                  <span className="mt-2 font-serif text-base font-semibold leading-snug text-neutral-900 group-hover:text-blue-700 dark:text-neutral-100 dark:group-hover:text-blue-400">
                    {previousPost.title}
                  </span>
                </button>
              ) : (
                <div className="hidden sm:block" />
              )}

              {nextPost ? (
                <button
                  type="button"
                  onClick={() => onOpenPost(nextPost.slug)}
                  className="group flex flex-col items-end rounded-lg border border-neutral-200 bg-white p-5 text-right transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-[#242730] dark:bg-[#14161B] dark:hover:border-neutral-700 dark:hover:bg-[#191C22]"
                >
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    <span>Next article</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                  <span className="mt-2 font-serif text-base font-semibold leading-snug text-neutral-900 group-hover:text-blue-700 dark:text-neutral-100 dark:group-hover:text-blue-400">
                    {nextPost.title}
                  </span>
                </button>
              ) : (
                <div className="hidden sm:block" />
              )}
            </div>
          </nav>
        )}
      </div>
    </article>
  );
}
