export interface WikiLink {
  target: string;
  alias?: string;
  heading?: string;
  isValid: boolean;
  resolvedPath?: string;
}

export interface WikiLinkSuggestion {
  label: string;
  path: string;
  type: string;
  frontmatter?: Record<string, any>;
}

const WIKI_LINK_REGEX = /\[\[([^\|\]]+)(?:\|([^\]]+))?(?:#([^\]]+))?\]\]/g;
const WIKI_LINK_SIMPLE_REGEX = /\[\[([^\]]+)\]\]/g;

export function parseWikiLinks(content: string): WikiLink[] {
  const links: WikiLink[] = [];
  let match;
  
  while ((match = WIKI_LINK_REGEX.exec(content)) !== null) {
    links.push({
      target: match[1].trim(),
      alias: match[2]?.trim(),
      heading: match[3]?.trim(),
      isValid: false,
    });
  }
  
  return links;
}

export function findWikiLinkAtPosition(content: string, position: number): WikiLink | null {
  let match;
  while ((match = WIKI_LINK_REGEX.exec(content)) !== null) {
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

export async function resolveWikiLink(
  target: string,
  currentFile: string,
  allFiles: Map<string, { frontmatter: Record<string, any>; content: string }>
): Promise<WikiLink> {
  const normalizedTarget = target.toLowerCase().trim();
  
  // 1. Try exact ID match
  for (const [path, file] of allFiles) {
    if (file.frontmatter?.id?.toLowerCase() === normalizedTarget) {
      return {
        target,
        isValid: true,
        resolvedPath: path,
      };
    }
  }
  
  // 2. Try exact title match
  for (const [path, file] of allFiles) {
    if (file.frontmatter?.title?.toLowerCase() === normalizedTarget) {
      return {
        target,
        isValid: true,
        resolvedPath: path,
      };
    }
  }
  
  // 3. Try filename match (without extension)
  for (const [path, file] of allFiles) {
    const filename = path.split('/').pop()?.replace(/\.md$/, '').toLowerCase();
    if (filename === normalizedTarget) {
      return {
        target,
        isValid: true,
        resolvedPath: path,
      };
    }
  }
  
  // 4. Fuzzy match - find best match
  let bestMatch: { path: string; score: number } | null = null;
  
  for (const [path, file] of allFiles) {
    const searchText = `${file.frontmatter?.title || ''} ${file.frontmatter?.id || ''} ${path}`.toLowerCase();
    const score = similarity(normalizedTarget, searchText);
    if (score > 0.6 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { path, score };
    }
  }
  
  if (bestMatch) {
    return {
      target,
      isValid: true,
      resolvedPath: bestMatch.path,
    };
  }
  
  return {
    target,
    isValid: false,
  };
}

function similarity(a: string, b: string): number {
  // Simple Jaccard similarity
  const setA = new Set(a.split(/\s+/).filter(Boolean));
  const setB = new Set(b.split(/\s+/).filter(Boolean));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

export function buildWikiLinkGraph(
  files: Map<string, { frontmatter: Record<string, any>; content: string }>
): { nodes: any[]; edges: any[] } {
  const nodes: any[] = [];
  const edges: any[] = [];
  const nodeMap = new Map<string, number>();
  
  // Create nodes
  let nodeIndex = 0;
  for (const [path, file] of files) {
    if (!file.frontmatter?.id) continue;
    
    const node = {
      id: file.frontmatter.id,
      label: file.frontmatter.title || path,
      type: file.frontmatter.type || 'unknown',
      status: file.frontmatter.status || 'draft',
      path,
      x: 0,
      y: 0,
    };
    
    nodes.push(node);
    nodeMap.set(file.frontmatter.id, nodeIndex++);
  }
  
  // Create edges from wiki-links and depends_on
  for (const [path, file] of files) {
    const sourceId = file.frontmatter?.id;
    if (!sourceId) continue;
    
    const sourceIndex = nodeMap.get(sourceId);
    if (sourceIndex === undefined) continue;
    
    // Wiki-links in content
    const wikiLinks = parseWikiLinks(file.content);
    for (const link of wikiLinks) {
      if (link.isValid && link.resolvedPath) {
        const targetFile = files.get(link.resolvedPath);
        const targetId = targetFile?.frontmatter?.id;
        if (targetId) {
          const targetIndex = nodeMap.get(targetId);
          if (targetIndex !== undefined) {
            edges.push({
              source: sourceIndex,
              target: targetIndex,
              type: 'link',
            });
          }
        }
      }
    }
    
    // depends_on
    if (file.frontmatter?.depends_on) {
      for (const depId of file.frontmatter.depends_on) {
        const targetIndex = nodeMap.get(depId);
        if (targetIndex !== undefined) {
          edges.push({
            source: sourceIndex,
            target: targetIndex,
            type: 'depends_on',
          });
        }
      }
    }
    
    // Shared tags
    if (file.frontmatter?.tags) {
      for (const [otherPath, otherFile] of files) {
        if (otherPath === path) continue;
        const otherTags = otherFile.frontmatter?.tags || [];
        const sharedTags = file.frontmatter.tags.filter((t: string) => otherTags.includes(t));
        if (sharedTags.length > 0) {
          const targetId = otherFile.frontmatter?.id;
          if (targetId) {
            const targetIndex = nodeMap.get(targetId);
            if (targetIndex !== undefined) {
              edges.push({
                source: sourceIndex,
                target: targetIndex,
                type: 'tag',
                weight: sharedTags.length,
              });
            }
          }
        }
      }
    }
  }
  
  return { nodes, edges };
}

export function getWikiLinkCompletions(
  prefix: string,
  files: Map<string, { frontmatter: Record<string, any>; content: string }>
): WikiLinkSuggestion[] {
  const suggestions: WikiLinkSuggestion[] = [];
  const lowerPrefix = prefix.toLowerCase();
  
  for (const [path, file] of files) {
    const id = file.frontmatter?.id;
    const title = file.frontmatter?.title;
    
    if (id && id.toLowerCase().includes(lowerPrefix)) {
      suggestions.push({
        label: id,
        path,
        type: file.frontmatter?.type || 'unknown',
        frontmatter: file.frontmatter,
      });
    }
    
    if (title && title.toLowerCase().includes(lowerPrefix)) {
      suggestions.push({
        label: title,
        path,
        type: file.frontmatter?.type || 'unknown',
        frontmatter: file.frontmatter,
      });
    }
    
    const filename = path.split('/').pop()?.replace(/\.md$/, '');
    if (filename && filename.toLowerCase().includes(lowerPrefix)) {
      suggestions.push({
        label: filename,
        path,
        type: file.frontmatter?.type || 'unknown',
        frontmatter: file.frontmatter,
      });
    }
  }
  
  // Deduplicate by label
  const seen = new Set<string>();
  return suggestions.filter(s => {
    if (seen.has(s.label)) return false;
    seen.add(s.label);
    return true;
  }).slice(0, 20);
}