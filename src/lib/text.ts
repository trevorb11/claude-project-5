/**
 * Strip inline markdown citations that the research agent embeds in
 * findings text, e.g. "([domainhomes.com](https://domainhomes.com/?utm_source=openai))".
 * Full source lists remain available on the case file pages; on summary
 * surfaces (compare, battle cards, dashboard) they are visual noise.
 */
export function stripCitations(text: string | null | undefined): string {
  if (!text) return "";
  return (
    text
      // "([label](url))" — parenthesized markdown link used as a citation
      .replace(/\s*\(\[[^\]]*\]\([^()]*(?:\([^()]*\)[^()]*)*\)\)/g, "")
      // "[label](url)" — bare markdown link: keep the label
      .replace(/\[([^\]]*)\]\([^()]*(?:\([^()]*\)[^()]*)*\)/g, "$1")
      // bare parenthesized URLs
      .replace(/\s*\(https?:\/\/[^)\s]+\)/g, "")
      .replace(/\s{2,}/g, " ")
      .trim()
  );
}
