import { parseWikiLinks, WikiLink } from "@/services/wikiLinks";

export function extractWikiLinks(content: string): WikiLink[] {
  return parseWikiLinks(content);
}

export function replaceWikiLinks(
  content: string,
  resolver: (link: WikiLink) => string
): string {
  return content.replace(/\[\[([^\|\]]+)(?:\|([^\]]+))?(?:#([^\]]+))?\]\]/g, (match, target, alias, heading) => {
    const link = { target, alias, heading, isValid: true, resolvedPath: "" };
    return resolver(link);
  });
}

export function getWikiLinkAtPosition(
  content: string,
  position: number
): WikiLink | null {
  const regex = /\[\[([^\|\]]+)(?:\|([^\]]+))?(?:#([^\]]+))?\]\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const start = match.index;
    const end = match.index + match[0].length;
    if (position >= start && position <= end) {
      return {
        target: match[1].trim(),
        alias: match[2]?.trim(),
        heading: match[3]?.trim(),
        isValid: false,
      };
    }
  }
  return null;
}