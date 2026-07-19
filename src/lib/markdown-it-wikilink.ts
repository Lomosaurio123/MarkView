// Custom markdown-it wiki-link plugin implementation
import MarkdownIt from 'markdown-it';

interface WikiLinkOptions {
  pageResolver?: (name: string) => string;
  linkClass?: string;
  linkAttributes?: Record<string, string>;
}

function markdownItWikilink(md: MarkdownIt, options: WikiLinkOptions = {}) {
  const {
    pageResolver = (name: string) => `/${name.toLowerCase().replace(/\s+/g, '-')}.md`,
    linkClass = 'wiki-link',
    linkAttributes = { 'data-wiki-link': 'true' },
  } = options;

  const wikiLinkRegex = /\[\[([^\|\]]+)(?:\|([^\]]+))?(?:#([^\]]+))?\]\]/g;

  md.inline.ruler.after('emphasis', 'wikilink', (state, silent) => {
    const pos = state.pos;
    const max = state.posMax;
    const text = state.src.slice(pos);

    const match = text.match(wikiLinkRegex);
    if (!match) return false;

    if (silent) return true;

    const [fullMatch, target, alias, heading] = match;
    const resolvedUrl = pageResolver(target.trim());

    const token = state.push('link_open', 'a', 1);
    token.attrs = [
      ['href', resolvedUrl],
      ['class', linkClass],
      ...Object.entries(linkAttributes),
    ];
    if (heading) {
      token.attrs.push(['href', `${resolvedUrl}#${heading.trim()}`]);
    }

    const textToken = state.push('text', '', 0);
    textToken.content = alias ? alias.trim() : target.trim();

    state.push('link_close', 'a', -1);

    state.pos += fullMatch.length;
    return true;
  });
}

export default markdownItWikilink;