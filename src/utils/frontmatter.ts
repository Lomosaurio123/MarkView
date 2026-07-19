import matter from "gray-matter";

export interface FrontmatterData {
  id?: string;
  title?: string;
  type?: string;
  status?: string;
  priority?: string;
  tags?: string[];
  links?: string[];
  depends_on?: string[];
  author?: string;
  created?: string;
  updated?: string;
  version?: string;
  [key: string]: any;
}

export function parseFrontmatter(content: string): { data: FrontmatterData; content: string } {
  const { data, content: body } = matter(content);
  return { data: data as FrontmatterData, content: body };
}

export function serializeFrontmatter(data: FrontmatterData, content: string): string {
  return matter.stringify(content, data);
}

export function validateFrontmatter(data: FrontmatterData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.id) {
    errors.push("Missing required field: id");
  } else if (!/^[A-Z]{2,4}-\d{3,}$/.test(data.id)) {
    errors.push("Invalid id format (expected: REQ-001, DES-003, etc.)");
  }
  
  if (!data.title || data.title.length < 3) {
    errors.push("Title must be at least 3 characters");
  }
  
  if (!data.type || !["vision", "requirement", "design", "task", "adr", "glossary"].includes(data.type)) {
    errors.push("Invalid type");
  }
  
  if (!data.status || !["draft", "review", "approved", "implemented", "deprecated", "archived"].includes(data.status)) {
    errors.push("Invalid status");
  }
  
  return { valid: errors.length === 0, errors };
}

export function generateSpecId(type: string, existing: string[]): string {
  const prefixes: Record<string, string> = {
    vision: "VIS",
    requirement: "REQ",
    design: "DES",
    task: "TASK",
    adr: "ADR",
    glossary: "GLS",
  };
  
  const prefix = prefixes[type] || "SPEC";
  const nums = existing
    .map((id) => {
      const match = id.match(new RegExp(`^${prefix}-(\\d+)$`));
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  
  let next = 1;
  for (const n of nums) {
    if (n === next) next++;
    else break;
  }
  
  return `${prefix}-${next.toString().padStart(3, "0")}`;
}