import MarkdownIt from 'markdown-it';

declare module 'markdown-it-footnote' {
  const footnote: (md: MarkdownIt) => void;
  export default footnote;
}

declare module 'markdown-it-task-lists' {
  interface TaskListOptions {
    enabled?: boolean;
    label?: boolean;
    labelAfter?: boolean;
  }
  const taskLists: (md: MarkdownIt, options?: TaskListOptions) => void;
  export default taskLists;
}

declare module 'markdown-it-wikilink' {
  interface WikiLinkOptions {
    pageResolver?: (name: string) => string;
    linkClass?: string;
  }
  const wikiLink: (md: MarkdownIt, options?: WikiLinkOptions) => void;
  export default wikiLink;
}