import { useState } from 'react';
import { Menu, Moon, PenLine, Sun, X } from 'lucide-react';
import { ThemeMode } from '../hooks/useTheme';
import { BlogCategory } from '../types/blog';

export type NavFilter = 'All' | BlogCategory;

interface HeaderProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  activeCategory: NavFilter;
  isAdminRoute: boolean;
  onSelectCategory: (category: NavFilter) => void;
  onNavigateHome: () => void;
  onNavigateAdmin: () => void;
}

const NAV_ITEMS: { label: string; value: NavFilter }[] = [
  { label: 'All Essays', value: 'All' },
  { label: 'AI & Tools', value: 'AI & Tools' },
  { label: 'Software', value: 'Software' },
  { label: 'Gadgets', value: 'Gadgets' },
  { label: 'Guides', value: 'Guides' },
];

/**
 * Clean 3-zone editorial top navigation bar.
 */
export function Header({
  theme,
  onToggleTheme,
  activeCategory,
  isAdminRoute,
  onSelectCategory,
  onNavigateHome,
  onNavigateAdmin,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleCategoryClick = (category: NavFilter) => {
    onSelectCategory(category);
    setMobileMenuOpen(false);
  };

  return (
    <header className="border-b border-neutral-200 bg-neutral-50/95 dark:border-[#242730] dark:bg-[#0C0D10]/95">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigateHome();
            setMobileMenuOpen(false);
          }}
          className="shrink-0 whitespace-nowrap font-serif text-xl font-semibold tracking-tight text-neutral-950 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700 dark:text-neutral-50"
        >
          Signal &amp; Craft
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Primary categories"
          className="hidden items-center gap-6 md:flex"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = !isAdminRoute && activeCategory === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => handleCategoryClick(item.value)}
                className={`shrink-0 whitespace-nowrap border-b-2 py-1 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700 ${
                  isActive
                    ? 'border-blue-700 text-neutral-950 dark:border-blue-400 dark:text-neutral-50'
                    : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-950 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-100'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Theme Toggle + Primary Action */}
        <div className="flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:border-[#242730] dark:bg-[#14161B] dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {isAdminRoute ? (
            <button
              type="button"
              onClick={() => {
                onNavigateHome();
                setMobileMenuOpen(false);
              }}
              className="inline-flex min-h-[40px] shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:border-[#242730] dark:bg-[#14161B] dark:text-neutral-100 dark:hover:bg-neutral-800"
            >
              <span>Read Blog</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onNavigateAdmin();
                setMobileMenuOpen(false);
              }}
              className="inline-flex min-h-[40px] shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <PenLine className="h-3.5 w-3.5" />
              <span>Post Editor</span>
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 transition-colors hover:bg-neutral-100 md:hidden dark:border-[#242730] dark:bg-[#14161B] dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile categories"
          className="border-t border-neutral-200 bg-white px-4 py-3 md:hidden dark:border-[#242730] dark:bg-[#14161B]"
        >
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = !isAdminRoute && activeCategory === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => handleCategoryClick(item.value)}
                  className={`flex min-h-[44px] items-center rounded-md px-3 text-left text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-neutral-100 text-neutral-950 dark:bg-neutral-800 dark:text-neutral-50'
                      : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
