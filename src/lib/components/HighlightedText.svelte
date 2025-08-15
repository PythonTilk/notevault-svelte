<script lang="ts">
  import { highlightText, parseSearchTerms } from '$lib/utils/highlight';

  export let text: string = '';
  export let searchTerm: string = '';
  export let highlightClass: string = 'bg-yellow-200 text-yellow-900 px-1 rounded font-medium';
  export let maxLength: number = 0; // 0 means no truncation

  $: displayText = maxLength > 0 && text.length > maxLength 
    ? text.substring(0, maxLength) + '...' 
    : text;

  $: highlightedHtml = searchTerm 
    ? highlightText(displayText, searchTerm, highlightClass)
    : displayText;
</script>

{@html highlightedHtml}