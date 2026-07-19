import MarkdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import markdownItFootnote from 'markdown-it-footnote';
import markdownItTaskLists from 'markdown-it-task-lists';
import markdownItWikilink from 'markdown-it-wikilink';
import { slugify } from 'transliteration';

let markdownInstance: MarkdownIt | null = null;

export function getMarkdownIt(): MarkdownIt {
  if (!markdownInstance) {
    markdownInstance = MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      breaks: true,
    })
      .use(markdownItAnchor, {
        permalink: {
          class: 'header-anchor',
          symbol: '#',
          renderAttrs: () => ({ 'aria-hidden': 'true' }),
        },
        level: [1, 2, 3, 4, 5, 6],
        slugify: (str: string) => slugify(str).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      })
      .use(markdownItFootnote)
      .use(markdownItTaskLists, { enabled: true, label: true })
      .use(markdownItWikilink, {
        pageResolver: (name: string) => {
          return `/${name.toLowerCase().replace(/\s+/g, '-')}.md`;
        },
        linkClass: 'wiki-link',
        linkAttributes: {
          'data-wiki-link': 'true',
        },
      });

    // Custom renderers
    const defaultRender = markdownInstance.renderer.rules.link_open || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
    markdownInstance.renderer.rules.link_open = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const href = token.attrGet('href') || '';
      
      // Handle wiki-links
      if (token.attrGet('data-wiki-link') === 'true') {
        token.attrSet('class', 'wiki-link text-primary underline decoration-dotted');
        token.attrSet('data-wiki-target', href);
      }
      
      // External links
      if (href.startsWith('http')) {
        token.attrSet('target', '_blank');
        token.attrSet('rel', 'noopener noreferrer');
        token.attrSet('class', 'external-link');
      }
      
      return defaultRender(tokens, idx, options, env, self);
    };

    // Code blocks with copy button
    const defaultFence = markdownInstance.renderer.rules.fence || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
    markdownInstance.renderer.rules.fence = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const lang = token.info ? token.info.trim().split(/\s+/)[0] : '';
      const code = token.content;
      
      return `<pre class="language-${lang}"><code class="language-${lang}">${escapeHtml(code)}</code></pre>`;
    };
  }
  
  return markdownInstance;
}

export const markdown = {
  render: async (content: string): Promise<string> => {
    const md = getMarkdownIt();
    return md.render(content);
  },
  
  renderInline: (content: string): string => {
    const md = getMarkdownIt();
    return md.renderInline(content);
  },
  
  parse: (content: string) => {
    const md = getMarkdownIt();
    return md.parse(content, {});
  },
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}