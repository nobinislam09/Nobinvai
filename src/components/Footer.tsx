import { NavFilter } from './Header';

interface FooterProps {
  onNavigateHome: () => void;
  onSelectCategory: (category: NavFilter) => void;
  onNavigateAdmin: () => void;
}

/**
 * Quiet editorial footer with category links and editor access.
 */
export function Footer({ onNavigateHome, onSelectCategory, onNavigateAdmin }: FooterProps) {
  return (
    <footer className="mt-20 border-t border-neutral-200 bg-neutral-50 dark:border-[#242730] dark:bg-[#0C0D10]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigateHome();
            }}
            className="font-serif text-base font-semibold text-neutral-900 dark:text-neutral-100"
          >
            Signal &amp; Craft
          </a>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Long-form essays on software systems, local AI tooling, and thoughtful hardware.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">
          <button
            type="button"
            onClick={() => onSelectCategory('AI & Tools')}
            className="hover:text-neutral-950 dark:hover:text-neutral-100"
          >
            AI &amp; Tools
          </button>
          <button
            type="button"
            onClick={() => onSelectCategory('Software')}
            className="hover:text-neutral-950 dark:hover:text-neutral-100"
          >
            Software
          </button>
          <button
            type="button"
            onClick={() => onSelectCategory('Gadgets')}
            className="hover:text-neutral-950 dark:hover:text-neutral-100"
          >
            Gadgets
          </button>
          <button
            type="button"
            onClick={() => onSelectCategory('Guides')}
            className="hover:text-neutral-950 dark:hover:text-neutral-100"
          >
            Guides
          </button>
          <button
            type="button"
            onClick={onNavigateAdmin}
            className="text-blue-700 hover:underline dark:text-blue-400"
          >
            Post Editor &amp; JSON Backup
          </button>
        </div>
      </div>
    </footer>
  );
}
