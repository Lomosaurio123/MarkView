use tauri::command;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use walkdir::WalkDir;
use gray_matter::{Matter, engine::YAML};

#[derive(Debug, Serialize)]
pub struct GraphData {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}

#[derive(Debug, Serialize)]
pub struct GraphNode {
    pub id: String,
    pub label: String,
    pub node_type: String,
    pub status: String,
    pub path: String,
    pub x: Option<f32>,
    pub y: Option<f32>,
}

#[derive(Debug, Serialize)]
pub struct GraphEdge {
    pub source: String,
    pub target: String,
    pub edge_type: String,
    pub weight: Option<f32>,
}

#[command]
pub async fn build(root: String) -> Result<GraphData, String> {
    let base_path = if root.is_empty() {
        std::env::current_dir().map_err(|e| e.to_string())?
    } else {
        std::path::PathBuf::from(&root)
    };
    
    let mut files = HashMap::new();
    
    for entry in WalkDir::new(&base_path).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if !path.is_file() || path.extension().map_or(true, |e| e != "md") {
            continue;
        }
        
        let relative = path.strip_prefix(&base_path).unwrap_or(path);
        let content = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
        
        let matter = Matter::<YAML>::new();
        let parsed = matter.parse(&content);
        
        let frontmatter = parsed.data
            .as_ref()
            .and_then(|d| serde_json::to_value(d).ok())
            .unwrap_or(serde_json::Value::Null);
        
        files.insert(relative.to_string_lossy().to_string(), (frontmatter, content));
    }
    
    let mut nodes = Vec::new();
    let mut edges = Vec::new();
    let mut node_map = HashMap::new();
    
    // Create nodes
    for (path, (frontmatter, _)) in &files {
        let id = frontmatter.get("id").and_then(|v| v.as_str()).unwrap_or(path);
        let label = frontmatter.get("title").and_then(|v| v.as_str()).unwrap_or(path);
        let node_type = frontmatter.get("type").and_then(|v| v.as_str()).unwrap_or("unknown");
        let status = frontmatter.get("status").and_then(|v| v.as_str()).unwrap_or("draft");
        
        let node = GraphNode {
            id: id.to_string(),
            label: label.to_string(),
            node_type: node_type.to_string(),
            status: status.to_string(),
            path: path.clone(),
            x: None,
            y: None,
        };
        
        node_map.insert(id.to_string(), nodes.len());
        nodes.push(node);
    }
    
    // Create edges from wiki-links, depends_on, and shared tags
    for (path, (frontmatter, content)) in &files {
        let source_id = frontmatter.get("id").and_then(|v| v.as_str()).unwrap_or(path);
        let source_idx = *node_map.get(source_id).unwrap();
        
        // Wiki-links
        let wiki_link_regex = regex::Regex::new(r"\[\[([^\|\]]+)(?:\|([^\]]+))?(?:#([^\]]+))?\]\]").unwrap();
        for cap in wiki_link_regex.captures_iter(content) {
            let target = cap.get(1).unwrap().as_str().trim();
            // Resolve target to node ID
            if let Some(target_idx) = resolve_wiki_link(target, &files, &node_map) {
                edges.push(GraphEdge {
                    source: source_id.to_string(),
                    target: nodes[target_idx].id.clone(),
                    edge_type: "link".to_string(),
                    weight: Some(1.0),
                });
            }
        }
        
        // depends_on
        if let Some(deps) = frontmatter.get("depends_on").and_then(|v| v.as_array()) {
            for dep in deps {
                if let Some(dep_str) = dep.as_str() {
                    if let Some(target_idx) = node_map.get(dep_str) {
                        edges.push(GraphEdge {
                            source: source_id.to_string(),
                            target: nodes[*target_idx].id.clone(),
                            edge_type: "depends_on".to_string(),
                            weight: Some(1.0),
                        });
                    }
                }
            }
        }
        
        // Shared tags
        if let Some(tags) = frontmatter.get("tags").and_then(|v| v.as_array()) {
            for (other_path, (other_fm, _)) in &files {
                if other_path == path { continue; }
                
                if let Some(other_tags) = other_fm.get("tags").and_then(|v| v.as_array()) {
                    let shared: Vec<_> = tags.iter()
                        .filter_map(|t| t.as_str())
                        .filter(|t| other_tags.iter().any(|ot| ot.as_str() == Some(*t)))
                        .collect();
                    
                    if !shared.is_empty() {
                        if let Some(other_id) = other_fm.get("id").and_then(|v| v.as_str()) {
                            if let Some(target_idx) = node_map.get(other_id) {
                                edges.push(GraphEdge {
                                    source: source_id.to_string(),
                                    target: nodes[*target_idx].id.clone(),
                                    edge_type: "tag".to_string(),
                                    weight: Some(shared.len() as f32),
                                });
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Deduplicate edges
    edges.sort_by(|a, b| a.source.cmp(&b.source).then(a.target.cmp(&b.target)));
    edges.dedup_by(|a, b| a.source == b.source && a.target == b.target);
    
    Ok(GraphData { nodes, edges })
}

fn resolve_wiki_link(
    target: &str,
    files: &HashMap<String, (serde_json::Value, String)>,
    node_map: &HashMap<String, usize>
) -> Option<usize> {
    let normalized = target.to_lowercase();
    
    // Try exact ID match
    for (path, (fm, _)) in files {
        if let Some(id) = fm.get("id").and_then(|v| v.as_str()) {
            if id.to_lowercase() == normalized {
                return node_map.get(id).copied();
            }
        }
    }
    
    // Try exact title match
    for (path, (fm, _)) in files {
        if let Some(title) = fm.get("title").and_then(|v| v.as_str()) {
            if title.to_lowercase() == normalized {
                if let Some(id) = fm.get("id").and_then(|v| v.as_str()) {
                    return node_map.get(id).copied();
                }
            }
        }
    }
    
    // Try filename match
    for (path, (fm, _)) in files {
        let filename = path.split('/').last()?.replace(".md", "");
        if filename.to_lowercase() == normalized {
            if let Some(id) = fm.get("id").and_then(|v| v.as_str()) {
                return node_map.get(id).copied();
            }
        }
    }
    
    None
}