export const createSearchRegex = (term: string): RegExp => {
  // Check for leading whitespace BEFORE trimming to determine anchor type
  const hasLeadingSpace = /^\s/.test(term);
  
  const trimmed = term.trim();
  if (!trimmed) return /.*/; // Match everything if empty

  // Escape special regex characters
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Split by whitespace
  const parts = escaped.split(/\s+/);
  
  // Determine anchor for the first word
  // If leading space exists -> no anchor (match anywhere)
  // If NO leading space -> ^ (start of string)
  const firstWordAnchor = hasLeadingSpace ? '' : '^';

  let pattern = '';
  if (parts.length === 1) {
    pattern = `${firstWordAnchor}${parts[0]}`;
  } else {
    // Multi-word: first word anchored based on leading space, rest can match anywhere
    pattern = `${firstWordAnchor}${parts[0]}.*${parts.slice(1).join('.*')}`;
  }
  
  return new RegExp(pattern, 'i');
};

export const parseSearchTerm = (term: string): { mode: 'normal' | 'generic'; regex: RegExp } => {
  const trimmedStart = term.trimStart();
  
  if (trimmedStart.startsWith('@')) {
    // Remove '@' but preserve potential leading space after it (e.g. "@ pan" vs "@pan")
    const genericTerm = trimmedStart.substring(1);
    return {
      mode: 'generic',
      regex: createSearchRegex(genericTerm)
    };
  }

  return {
    mode: 'normal',
    regex: createSearchRegex(term)
  };
};
