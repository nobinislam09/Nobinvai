import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { ArticleView } from './components/ArticleView';
import { Footer } from './components/Footer';
import { Header, NavFilter } from './components/Header';
import { HomePage } from './components/HomePage';
import { PostEditor } from './components/PostEditor';
import { useBlogStore } from './hooks/useBlogStore';
import { useTheme } from './hooks/useTheme';
import { BlogCategory, PostDraftInput } from './types/blog';

type AppRoute =
  | { view: 'home' }
  | { view: 'post'; slug: string }
  | { view: 'admin' }
  | { view: 'admin-new' }
  | { view: 'admin-edit'; id: string };

function parseRoute(pathname: string): AppRoute {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/admin') return { view: 'admin' };
  if (clean === '/admin/new') return { view: 'admin-new' };
  if (clean.startsWith('/admin/edit/')) {
    const id = decodeURIComponent(clean.slice('/admin/edit/'.length));
    return id ? { view: 'admin-edit', id } : { view: 'admin' };
  }
  if (clean.startsWith('/post/')) {
    const slug = decodeURIComponent(clean.slice('/post/'.length));
    return slug ? { view: 'post', slug } : { view: 'home' };
  }
  return { view: 'home' };
}

function routeToPath(route: AppRoute): string {
  switch (route.view) {
    case 'home':
      return '/';
    case 'post':
      return `/post/${encodeURIComponent(route.slug)}`;
    case 'admin':
      return '/admin';
    case 'admin-new':
      return '/admin/new';
    case 'admin-edit':
      return `/admin/edit/${encodeURIComponent(route.id)}`;
  }
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const {
    posts,
    storageError,
    clearStorageError,
    createPost,
    updatePost,
    deletePost,
    togglePostStatus,
    duplicatePost,
    importPosts,
    resetToSamplePosts,
  } = useBlogStore();

  const [route, setRoute] = useState<AppRoute>(() => parseRoute(window.location.pathname));
  const [activeCategory, setActiveCategory] = useState<NavFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const navigate = useCallback((nextRoute: AppRoute) => {
    const nextPath = routeToPath(nextRoute);
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setRoute(parseRoute(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const orderedPublishedPosts = useMemo(
    () =>
      posts
        .filter((p) => p.status === 'published')
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    [posts]
  );

  const handleSelectCategory = (category: NavFilter) => {
    setActiveCategory(category);
    setActiveTag(null);
    if (route.view !== 'home') {
      navigate({ view: 'home' });
    }
  };

  const handleFilterByTag = (tag: string) => {
    setActiveCategory('All');
    setActiveTag(tag);
    navigate({ view: 'home' });
  };

  const handleSaveEditor = (input: PostDraftInput, existingId?: string) => {
    const result = existingId ? updatePost(existingId, input) : createPost(input);
    if (result.ok) {
      navigate({ view: 'admin' });
    }
    return result;
  };

  const isAdminRoute =
    route.view === 'admin' || route.view === 'admin-new' || route.view === 'admin-edit';

  // Resolve current article + adjacent navigation for /post/:slug
  const activeArticle =
    route.view === 'post' ? posts.find((p) => p.slug === route.slug) ?? null : null;

  const { previousPost, nextPost } = useMemo(() => {
    if (!activeArticle) return { previousPost: null, nextPost: null };
    const idx = orderedPublishedPosts.findIndex((p) => p.id === activeArticle.id);
    if (idx === -1) return { previousPost: null, nextPost: null };
    return {
      previousPost: idx > 0 ? orderedPublishedPosts[idx - 1] : null,
      nextPost: idx < orderedPublishedPosts.length - 1 ? orderedPublishedPosts[idx + 1] : null,
    };
  }, [activeArticle, orderedPublishedPosts]);

  // Resolve post being edited for /admin/edit/:id
  const editingPost =
    route.view === 'admin-edit' ? posts.find((p) => p.id === route.id) : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 text-neutral-900 transition-colors dark:bg-[#0C0D10] dark:text-neutral-100">
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        activeCategory={activeCategory}
        isAdminRoute={isAdminRoute}
        onSelectCategory={handleSelectCategory}
        onNavigateHome={() => {
          setActiveCategory('All');
          setActiveTag(null);
          navigate({ view: 'home' });
        }}
        onNavigateAdmin={() => navigate({ view: 'admin' })}
      />

      <div className="flex-1">
        {route.view === 'home' && (
          <HomePage
            posts={posts}
            activeCategory={activeCategory}
            searchQuery={searchQuery}
            activeTag={activeTag}
            onSelectCategory={setActiveCategory}
            onSearchChange={setSearchQuery}
            onSelectTag={setActiveTag}
            onOpenPost={(slug) => navigate({ view: 'post', slug })}
          />
        )}

        {route.view === 'post' && (
          activeArticle ? (
            <ArticleView
              post={activeArticle}
              previousPost={previousPost}
              nextPost={nextPost}
              onBackHome={() => navigate({ view: 'home' })}
              onOpenPost={(slug) => navigate({ view: 'post', slug })}
              onEditPost={(id) => navigate({ view: 'admin-edit', id })}
              onFilterByCategory={(cat: BlogCategory) => handleSelectCategory(cat)}
              onFilterByTag={handleFilterByTag}
            />
          ) : (
            <main className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
              <h1 className="font-serif text-3xl font-semibold text-neutral-950 dark:text-neutral-50">
                Article not found
              </h1>
              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                This essay may have been renamed, moved to drafts, or deleted.
              </p>
              <button
                type="button"
                onClick={() => navigate({ view: 'home' })}
                className="mt-6 inline-flex min-h-[40px] items-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                Return to homepage
              </button>
            </main>
          )
        )}

        {route.view === 'admin' && (
          <AdminDashboard
            posts={posts}
            storageError={storageError}
            onClearStorageError={clearStorageError}
            onCreateNew={() => navigate({ view: 'admin-new' })}
            onEditPost={(id) => navigate({ view: 'admin-edit', id })}
            onReadPost={(slug) => navigate({ view: 'post', slug })}
            onToggleStatus={togglePostStatus}
            onDuplicatePost={(id) => {
              const copy = duplicatePost(id);
              if (copy) {
                navigate({ view: 'admin-edit', id: copy.id });
              }
            }}
            onDeletePost={deletePost}
            onImportPosts={importPosts}
            onResetSamples={resetToSamplePosts}
          />
        )}

        {route.view === 'admin-new' && (
          <PostEditor
            onSave={handleSaveEditor}
            onCancel={() => navigate({ view: 'admin' })}
          />
        )}

        {route.view === 'admin-edit' && (
          editingPost ? (
            <PostEditor
              key={editingPost.id}
              initialPost={editingPost}
              onSave={handleSaveEditor}
              onCancel={() => navigate({ view: 'admin' })}
            />
          ) : (
            <main className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
              <h1 className="font-serif text-2xl font-semibold text-neutral-950 dark:text-neutral-50">
                Post not found
              </h1>
              <button
                type="button"
                onClick={() => navigate({ view: 'admin' })}
                className="mt-6 inline-flex min-h-[40px] items-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                Back to Post Management
              </button>
            </main>
          )
        )}
      </div>

      <Footer
        onNavigateHome={() => {
          setActiveCategory('All');
          setActiveTag(null);
          navigate({ view: 'home' });
        }}
        onSelectCategory={handleSelectCategory}
        onNavigateAdmin={() => navigate({ view: 'admin' })}
      />
    </div>
  );
}
