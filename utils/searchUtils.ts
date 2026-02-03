/**
 * createSearchRegex - Converts a search string into a smart Regular Expression.
 *
 * Key Features:
 * 1. Smart Anchoring:
 *    - If the term starts with a character (no leading space), it anchors to the start of the word (^).
 *    - If the term starts with a space, it allows matching anywhere in the content.
 * 2. Multi-word Support:
 *    - Treats spaces as "fuzzy" matches (.*), allowing words to be separated by other text.
 * 3. Case Insensitivity:
 *    - All matches ignore case ('i' flag).
 *
 * @param term - The raw search term from input.
 * @returns A case-insensitive RegExp object.
 */
export const createSearchRegex = (term: string): RegExp => {
  // Check for leading whitespace BEFORE trimming to determine if we should anchor to start
  const hasLeadingSpace = /^\s/.test(term);

  const trimmed = term.trim();
  if (!trimmed) return /.*/; // Match everything if empty

  // Escape special regex characters (like . * +) to prevent injection
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Split the input into separate words
  const parts = escaped.split(/\s+/);

  // Determine anchor for the first word:
  // - No leading space -> ^ (must start with this term)
  // - Leading space -> '' (can match anywhere)
  const firstWordAnchor = hasLeadingSpace ? '' : '^';

  let pattern = '';
  if (parts.length === 1) {
    pattern = `${firstWordAnchor}${parts[0]}`;
  } else {
    // Multi-word: join parts with .* to allow matching across fields effectively
    pattern = `${firstWordAnchor}${parts[0]}.*${parts.slice(1).join('.*')}`;
  }

  return new RegExp(pattern, 'i');
};

/**
 * parseSearchTerm - Detects search mode based on prefix characters (@, #).
 *
 * Supported Prefixes:
 * - '@': Search by Generic/Scientific Name.
 * - '#': Search by Active Ingredient.
 * - None: Default search (Brand Name, Category, or Description).
 *
 * @param term - The search string typed by the user.
 * @returns Object with recognized mode and the compiled RegExp.
 */
export const parseSearchTerm = (
  term: string
): { mode: 'normal' | 'generic' | 'ingredient'; regex: RegExp } => {
  const trimmedStart = term.trimStart();

  // Check for Generic Name Mode (@ prefix)
  if (trimmedStart.startsWith('@')) {
    const genericTerm = trimmedStart.substring(1);
    return {
      mode: 'generic',
      regex: createSearchRegex(genericTerm),
    };
  }

  // Check for Ingredient Mode (# prefix)
  if (trimmedStart.startsWith('#')) {
    const ingredientTerm = trimmedStart.substring(1);
    return {
      mode: 'ingredient',
      regex: createSearchRegex(ingredientTerm),
    };
  }

  // Default Search Mode
  return {
    mode: 'normal',
    regex: createSearchRegex(term),
  };
};
