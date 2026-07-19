use tauri::command;
use walkdir::WalkDir;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::fs;
use gray_matter::{Matter, engine::YAML};

#[derive(Debug, Serialize, Deserialize)]
pub struct FileNode {
    pub path: String,
    pub name: String,
    pub is_directory: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileNode>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expanded: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selected: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub frontmatter: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub git_status: Option<String>,
}

#[command]
pub async fn fs_read_dir(path: String, depth: Option<usize>) -> Result<Vec<FileNode>, String> {
    let base_path = if path.is_empty() {
        std::env::current_dir().map_err(|e| e.to_string())?
    } else {
        PathBuf::from(&path)
    };
    
    let max_depth = depth.unwrap_or(3);
    let mut nodes = Vec::new();
    
    for entry in WalkDir::new(&base_path)
        .max_depth(max_depth)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        let relative_path = path.strip_prefix(&base_path).unwrap_or(path);
        
        if relative_path.to_string_lossy().starts_with('.') {
            continue;
        }
        
        let is_dir = path.is_dir();
        let name = path.file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        
        let node = FileNode {
            path: relative_path.to_string_lossy().to_string(),
            name,
            is_directory: is_dir,
            children: None,
            expanded: Some(false),
            selected: Some(false),
            frontmatter: None,
            git_status: None,
        };
        
        nodes.push(node);
    }
    
    // Build tree structure
    nodes.sort_by(|a, b| {
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.cmp(&b.name),
        }
    });
    
    Ok(build_tree(nodes))
}

fn build_tree(nodes: Vec<FileNode>) -> Vec<FileNode> {
    let mut root = Vec::new();
    let mut path_map: std::collections::HashMap<String, Vec<FileNode>> = std::collections::HashMap::new();
    
    for node in nodes {
        let parent_path = Path::new(&node.path)
            .parent()
            .and_then(|p| p.to_str())
            .unwrap_or("")
            .to_string();
        
        if parent_path.is_empty() || parent_path == "." {
            root.push(node);
        } else {
            path_map.entry(parent_path).or_default().push(node);
        }
    }
    
    // Attach children to parents
    for parent in &mut root {
        attach_children(parent, &mut path_map);
    }
    
    root
}

fn attach_children(node: &mut FileNode, path_map: &mut std::collections::HashMap<String, Vec<FileNode>>) {
    if let Some(children) = path_map.remove(&node.path) {
        let mut children = children;
        for child in &mut children {
            attach_children(child, path_map);
        }
        node.children = Some(children);
    }
}

#[command]
pub async fn fs_read_file(path: String) -> Result<FileContent, String> {
    let full_path = std::env::current_dir().map_err(|e| e.to_string())?.join(&path);
    let content = fs::read_to_string(&full_path).map_err(|e| e.to_string())?;
    
    let matter = Matter::<YAML>::new();
    let parsed = matter.parse(&content);
    
    let frontmatter = parsed.data
        .as_ref()
        .and_then(|d| serde_json::to_value(d).ok())
        .unwrap_or(serde_json::Value::Null);
    
    Ok(FileContent {
        path,
        content: parsed.content,
        frontmatter,
    })
}

#[derive(Debug, Serialize)]
pub struct FileContent {
    pub path: String,
    pub content: String,
    pub frontmatter: serde_json::Value,
}

#[command]
pub async fn fs_write_file(path: String, content: String, frontmatter: Option<serde_json::Value>) -> Result<(), String> {
    let full_path = std::env::current_dir().map_err(|e| e.to_string())?.join(&path);
    
    let final_content = if let Some(fm) = frontmatter {
        let matter = Matter::<YAML>::new();
        let serialized = serde_yaml::to_string(&fm).map_err(|e| e.to_string())?;
        format!("---\n{}---\n\n{}", serialized, content)
    } else {
        content
    };
    
    fs::write(&full_path, final_content).map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub async fn fs_create_file(path: String, _template: String, _vars: serde_json::Value) -> Result<FileNode, String> {
    let full_path = std::env::current_dir().map_err(|e| e.to_string())?.join(&path);
    
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    
    fs::write(&full_path, "").map_err(|e| e.to_string())?;
    
    Ok(FileNode {
        path,
        name: full_path.file_name().unwrap().to_string_lossy().to_string(),
        is_directory: false,
        children: None,
        expanded: Some(false),
        selected: Some(false),
        frontmatter: None,
        git_status: Some("untracked".to_string()),
    })
}

#[command]
pub async fn fs_delete(path: String, recursive: Option<bool>) -> Result<(), String> {
    let full_path = std::env::current_dir().map_err(|e| e.to_string())?.join(&path);
    
    if full_path.is_dir() {
        if recursive.unwrap_or(false) {
            fs::remove_dir_all(&full_path).map_err(|e| e.to_string())?;
        } else {
            fs::remove_dir(&full_path).map_err(|e| e.to_string())?;
        }
    } else {
        fs::remove_file(&full_path).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[command]
pub async fn fs_rename(from: String, to: String) -> Result<FileNode, String> {
    let base = std::env::current_dir().map_err(|e| e.to_string())?;
    let from_path = base.join(&from);
    let to_path = base.join(&to);
    
    if let Some(parent) = to_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    
    fs::rename(&from_path, &to_path).map_err(|e| e.to_string())?;
    
    Ok(FileNode {
        path: to,
        name: to_path.file_name().unwrap().to_string_lossy().to_string(),
        is_directory: to_path.is_dir(),
        children: None,
        expanded: Some(false),
        selected: Some(false),
        frontmatter: None,
        git_status: Some("renamed".to_string()),
    })
}