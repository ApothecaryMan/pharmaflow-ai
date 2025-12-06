export const createSearchRegex = (term: string): RegExp => {
  const trimmed = term.trim();
  if (!trimmed) return /.*/; // Match everything if empty

  // Escape special regex characters
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Replace whitespace with .* to allow matching any characters in between
  const pattern = escaped.split(/\s+/).join('.*');
  
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
