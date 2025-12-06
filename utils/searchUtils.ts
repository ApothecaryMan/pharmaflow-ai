export const createSearchRegex = (term: string): RegExp => {
  const trimmed = term.trim();
  if (!trimmed) return /.*/; // Match everything if empty

  // Escape special regex characters
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Split by whitespace
  const parts = escaped.split(/\s+/);
  
  // First word: must match from word boundary (start of a word)
  // Subsequent words: can match anywhere in the string
  let pattern = '';
  if (parts.length === 1) {
    // Single word: match from word boundary
    pattern = `\\b${parts[0]}`;
  } else {
    // Multi-word: first word from word boundary, rest can match anywhere
    pattern = `\\b${parts[0]}.*${parts.slice(1).join('.*')}`;
  }
  
  return new RegExp(pattern, 'i');
};

export const parseSearchTerm = (term: string): { mode: 'normal' | 'ingredient'; regex: RegExp } => {
  const trimmed = term.trim();
  
  if (trimmed.startsWith('@')) {
    const ingredientTerm = trimmed.substring(1).trim();
    return {
      mode: 'ingredient',
      regex: createSearchRegex(ingredientTerm)
    };
  }

  return {
    mode: 'normal',
    regex: createSearchRegex(trimmed)
  };
};
