import { useMemo } from 'react';
import { ArrowRight, Search, X } from 'lucide-react';
import { BLOG_CATEGORIES, BlogPost } from '../types/blog';
import { formatEditorialDate } from '../utils/blogHelpers';
import { NavFilter } from './Header';
import { ResilientImage } from './ResilientImage';

interface HomePageProps {
  posts: BlogPost[];
  activeCategory: NavFilter;
  searchQuery: string;
  activeTag: string | null;
  onSelectCategory: (category: NavFilter) => void;
  onSearchChange: (value: string) => void;
  onSelectTag: (tag: string | null) => void;
  onOpenPost: (slug: string) => void;
}

/**
 * Editorial homepage featuring a search/category bar, lead featured essay,
 * and responsive article grid with clean unboxed metadata.
 */
export function HomePage({
  posts,
  activeCategory,
  searchQuery,
  activeTag,
  onSelectCategory,
  onSearchChange,
  onSelectTag,
  onOpenPost,
}: HomePageProps) {
  const publishedPosts = useMemo(
    () =>
      posts
        .filter((p) => p.status === 'published')
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    [posts]
  );

  const isFiltered =
    activeCategory !== 'All' || searchQuery.trim().length > 0 || activeTag !== null;

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return publishedPosts.filter((post) => {
      if (activeCategory !== 'All' && post.category !== activeCategory) return false;
      if (activeTag && !post.tags.some((t) => t.toLowerCase() === activeTag.toLowerCase())) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        post.title,
        post.excerpt,
        post.category,
        post.author,
        post.tags.join(' '),
        post.content,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [publishedPosts, activeCategory, activeTag, searchQuery]);

  // Select the lead story only on the unfiltered homepage view
  const leadPost = useMemo(() => {
    if (isFiltered || publishedPosts.length === 0) return null;
    return publishedPosts.find((p) => p.featured) ?? publishedPosts[0];
  }, [isFiltered, publishedPosts]);

  const gridPosts = useMemo(() => {
    if (!leadPost) return filteredPosts;
    return filteredPosts.filter((p) => p.id !== leadPost.id);
  }, [filteredPosts, leadPost]);

  const clearAllFilters = () => {
    onSelectCategory('All');
    onSearchChange('');
    onSelectTag(null);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      {/* Masthead Intro & Search/Filter Toolbar */}
      <section className="border-b border-neutral-200 pb-8 dark:border-[#242730]">
        <div className="max-w-2xl">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-neutral-950 [text-wrap:balance] sm:text-4xl dark:text-neutral-50">
            Essays on software systems, local intelligence, and enduring hardware.
          </h1>
          <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
            Independent technical writing designed for calm, focused reading.
          </p>
        </div>

        <div className="mt-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Category Segmented Filter */}
          <div
            role="tablist"
            aria-label="Filter articles by category"
            className="flex flex-wrap items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-100/80 p-1 dark:border-[#242730] dark:bg-[#14161B]"
          >
            {(['All', ...BLOG_CATEGORIES] as NavFilter[]).map((category) => {
              const selected = activeCategory === category;
              return (
                <button
                  key={category}
                  role="tab"
                  aria-selected={selected}
                  type="button"
                  onClick={() => onSelectCategory(category)}
                  className={`min-h-[36px] shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                    selected
                      ? 'bg-white text-neutral-950 shadow-xs dark:bg-[#232732] dark:text-neutral-50'
                      : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search articles, topics, tags..."
              aria-label="Search articles"
              className="min-h-[42px] w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-9 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-700 focus:outline-none dark:border-[#242730] dark:bg-[#14161B] dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-blue-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Active Tag Filter Strip */}
        {activeTag && (
          <div className="mt-4 flex items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400">
            <span>
              Filtering by tag:{' '}
              <strong className="font-semibold text-neutral-950 dark:text-neutral-100">
                {activeTag}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => onSelectTag(null)}
              className="font-medium text-blue-700 hover:underline dark:text-blue-400"
            >
              Clear tag
            </button>
          </div>
        )}
      </section>

      {/* Lead Featured Post (Unfiltered Home View) */}
      {leadPost && (
        <section className="border-b border-neutral-200 py-10 dark:border-[#242730]">
          <article className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <a
                href={`/post/${leadPost.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  onOpenPost(leadPost.slug);
                }}
                className="group block h-full overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-[#242730] dark:bg-[#14161B]"
              >
                <ResilientImage
                  src={leadPost.coverImage}
                  alt={leadPost.title}
                  fallbackLabel={leadPost.category}
                  className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-[1.015] lg:h-full"
                  aspectClassName="aspect-video lg:h-full"
                />
              </a>
            </div>

            <div className="flex flex-col justify-between py-1 lg:col-span-5">
              <div>
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                  <span className="font-sans font-medium text-blue-700 dark:text-blue-400">
                    {leadPost.category}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{formatEditorialDate(leadPost.publishedAt)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{leadPost.readingTimeMinutes} min read</span>
                </div>

                <h2 className="mt-3 font-serif text-2xl font-semibold leading-snug tracking-tight text-neutral-950 [text-wrap:balance] sm:text-3xl dark:text-neutral-50">
                  <a
                    href={`/post/${leadPost.slug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenPost(leadPost.slug);
                    }}
                    className="hover:text-blue-700 dark:hover:text-blue-400"
                  >
                    {leadPost.title}
                  </a>
                </h2>

                <p className="mt-4 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {leadPost.excerpt}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-neutral-200 pt-4 dark:border-[#242730]">
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  By {leadPost.author}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenPost(leadPost.slug)}
                  className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <span>Read essay</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </article>
        </section>
      )}

      {/* Article Grid */}
      <section className="pt-10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-neutral-950 dark:text-neutral-50">
            {isFiltered ? `Matching Articles (${filteredPosts.length})` : 'Latest Publications'}
          </h2>
          {isFiltered && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs font-medium text-blue-700 hover:underline dark:text-blue-400"
            >
              Reset filters
            </button>
          )}
        </div>

        {gridPosts.length === 0 && !leadPost ? (
          <div className="rounded-lg border border-neutral-200 bg-white px-6 py-14 text-center dark:border-[#242730] dark:bg-[#14161B]">
            <p className="font-serif text-lg font-medium text-neutral-900 dark:text-neutral-100">
              No published essays match your current filter.
            </p>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              Try adjusting your search keywords or switching back to all categories.
            </p>
            <button
              type="button"
              onClick={clearAllFilters}
              className="mt-5 inline-flex min-h-[40px] items-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Show all essays
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
            {gridPosts.map((post) => (
              <article key={post.id} className="flex flex-col">
                <a
                  href={`/post/${post.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenPost(post.slug);
                  }}
                  className="group block overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-[#242730] dark:bg-[#14161B]"
                >
                  <ResilientImage
                    src={post.coverImage}
                    alt={post.title}
                    fallbackLabel={post.category}
                    className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    aspectClassName="aspect-[4/3]"
                  />
                </a>

                <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                  <button
                    type="button"
                    onClick={() => onSelectCategory(post.category)}
                    className="font-sans font-medium text-blue-700 hover:underline dark:text-blue-400"
                  >
                    {post.category}
                  </button>
                  <span aria-hidden="true">·</span>
                  <span>{formatEditorialDate(post.publishedAt)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{post.readingTimeMinutes} min read</span>
                </div>

                <h3 className="mt-2.5 font-serif text-xl font-semibold leading-snug tracking-tight text-neutral-950 [text-wrap:balance] dark:text-neutral-50">
                  <a
                    href={`/post/${post.slug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenPost(post.slug);
                    }}
                    className="hover:text-blue-700 dark:hover:text-blue-400"
                  >
                    {post.title}
                  </a>
                </h3>

                <p className="mt-2.5 line-clamp-3 flex-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {post.excerpt}
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-neutral-200/80 pt-3 text-xs text-neutral-500 dark:border-[#242730] dark:text-neutral-400">
                  <span>{post.author}</span>
                  {post.tags.length > 0 && (
                    <div className="flex items-center gap-2 truncate">
                      {post.tags.slice(0, 2).map((tag, idx) => (
                        <span key={tag} className="inline-flex items-center gap-2">
                          {idx > 0 && <span aria-hidden="true">/</span>}
                          <button
                            type="button"
                            onClick={() => onSelectTag(tag)}
                            className="hover:text-neutral-900 hover:underline dark:hover:text-neutral-200"
                          >
                            {tag}
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
