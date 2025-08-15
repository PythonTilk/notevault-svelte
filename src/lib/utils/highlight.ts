/**
 * Highlights search terms in text with HTML markup
 * @param text - The text to highlight
 * @param searchTerm - The term to highlight
 * @param className - CSS class to apply to highlighted terms
 * @returns HTML string with highlighted terms
 */
export function highlightText(text: string, searchTerm: string, className: string = 'bg-yellow-200 text-yellow-900'): string {
  if (!text || !searchTerm) return text;
  
  // Escape special regex characters in the search term
  const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Create regex for case-insensitive matching
  const regex = new RegExp(`(${escapedTerm})`, 'gi');
  
  // Replace matches with highlighted version
  return text.replace(regex, `<span class="${className}">$1</span>`);
}

/**
 * Highlights multiple search terms in text
 * @param text - The text to highlight
 * @param searchTerms - Array of terms to highlight
 * @param className - CSS class to apply to highlighted terms
 * @returns HTML string with highlighted terms
 */
export function highlightMultipleTerms(text: string, searchTerms: string[], className: string = 'bg-yellow-200 text-yellow-900'): string {
  if (!text || !searchTerms.length) return text;
  
  let result = text;
  
  // Sort terms by length (longest first) to avoid partial replacements
  const sortedTerms = [...searchTerms].sort((a, b) => b.length - a.length);
  
  for (const term of sortedTerms) {
    if (term.trim()) {
      result = highlightText(result, term.trim(), className);
    }
  }
  
  return result;
}

/**
 * Extracts preview text around the first occurrence of search term
 * @param text - The full text
 * @param searchTerm - The term to find
 * @param contextLength - Number of characters to show around the term
 * @returns Preview text with highlighted term
 */
export function getHighlightedPreview(text: string, searchTerm: string, contextLength: number = 100): string {
  if (!text || !searchTerm) return text.substring(0, contextLength * 2) + (text.length > contextLength * 2 ? '...' : '');
  
  const lowerText = text.toLowerCase();
  const lowerTerm = searchTerm.toLowerCase();
  const index = lowerText.indexOf(lowerTerm);
  
  if (index === -1) {
    // Term not found, return beginning of text
    return text.substring(0, contextLength * 2) + (text.length > contextLength * 2 ? '...' : '');
  }
  
  // Calculate start and end positions
  const start = Math.max(0, index - contextLength);
  const end = Math.min(text.length, index + searchTerm.length + contextLength);
  
  let preview = text.substring(start, end);
  
  // Add ellipsis if we're not at the beginning/end
  if (start > 0) preview = '...' + preview;
  if (end < text.length) preview = preview + '...';
  
  // Highlight the search term
  return highlightText(preview, searchTerm, 'bg-yellow-200 text-yellow-900 px-1 rounded');
}

/**
 * Splits search query into individual terms
 * @param query - Search query string
 * @returns Array of search terms
 */
export function parseSearchTerms(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .filter(term => term.length > 0);
}