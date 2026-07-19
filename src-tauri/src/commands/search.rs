use tauri::command;
use serde::{Deserialize, Serialize};
use walkdir::WalkDir;
use gray_matter::{Matter, engine::YAML};
use tantivy::{schema::*, Index, IndexWriter, DocAddress};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

static SEARCH_INDEX: Mutex<Option<Arc<Index>>> = Mutex::new(None);

#[derive(Debug, Serialize)]
pub struct IndexStats {
    pub files_indexed: usize,
    pub duration_ms: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub path: String,
    pub title: String,
    pub content_type: String,
    pub status: String,
    pub tags: Vec<String>,
    pub id: String,
    pub score: f64,
    pub highlights: SearchHighlights,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchHighlights {
    pub content: Option<Vec<String>>,
    pub title: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchFilters {
    pub types: Option<Vec<String>>,
    pub statuses: Option<Vec<String>>,
    pub tags: Option<Vec<String>>,
    pub paths: Option<Vec<String>>,
    pub date_range: Option<DateRange>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DateRange {
    pub start: String,
    pub end: String,
}

fn get_schema() -> Schema {
    let mut builder = SchemaBuilder::new();
    
    builder.add_text_field("path", TEXT | STORED);
    builder.add_text_field("title", TEXT | STORED);
    builder.add_text_field("content", TEXT);
    builder.add_json_field("frontmatter", STORED);
    builder.add_string_field("type", STRING | STORED | FAST);
    builder.add_string_field("status", STRING | STORED | FAST);
    builder.add_string_field("tags", STRING | STORED | FAST);
    builder.add_string_field("id", STRING | STORED | FAST);
    builder.add_date_field("updated", STORED | FAST);
    
    builder.build()
}

fn get_index() -> Result<Arc<Index>, String> {
    let mut guard = SEARCH_INDEX.lock().unwrap();
    if let Some(index) = guard.as_ref() {
        return Ok(Arc::clone(index));
    }
    
    let index_path = std::env::current_dir().map_err(|e| e.to_string())?.join(".markview/index.tantivy");
    std::fs::create_dir_all(&index_path).map_err(|e| e.to_string())?;
    
    let index = Index::create_in_dir(&index_path, get_schema()).map_err(|e| e.to_string())?;
    let arc = Arc::new(index);
    *guard = Some(Arc::clone(&arc));
    Ok(arc)
}

#[command]
pub async fn index(root: String, force: bool) -> Result<IndexStats, String> {
    let start = std::time::Instant::now();
    let index = get_index()?;
    let mut writer: IndexWriter = index.writer(50_000_000).map_err(|e| e.to_string())?;
    
    let base = if root.is_empty() {
        std::env::current_dir().map_err(|e| e.to_string())?
    } else {
        PathBuf::from(root)
    };
    
    let spec_dir = base.join("specs");
    if !spec_dir.exists() {
        writer.commit().map_err(|e| e.to_string())?;
        return Ok(IndexStats { files_indexed: 0, duration_ms: start.elapsed().as_millis() as u64 });
    }
    
    let matter = Matter::<YAML>::new();
    let mut count = 0;
    
    for entry in WalkDir::new(&spec_dir).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.extension().map_or(false, |e| e == "md") {
            let content = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
            let result = matter.parse(&content);
            
            let frontmatter = result.data.as_ref().and_then(|d| d.deserialize::<serde_json::Value>().ok()).unwrap_or(serde_json::json!({}));
            
            let rel_path = path.strip_prefix(&base).unwrap_or(path).to_string_lossy().to_string();
            let title = frontmatter.get("title").and_then(|v| v.as_str()).unwrap_or("");
            let content_type = frontmatter.get("type").and_then(|v| v.as_str()).unwrap_or("");
            let status = frontmatter.get("status").and_then(|v| v.as_str()).unwrap_or("");
            let id = frontmatter.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let tags = frontmatter.get("tags").and_then(|v| v.as_array())
                .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect::<Vec<_>>().join(" "))
                .unwrap_or_default();
            let updated = frontmatter.get("updated").and_then(|v| v.as_str()).unwrap_or("");
            
            writer.add_document(doc!(
                "path" => rel_path,
                "title" => title,
                "content" => &result.content,
                "frontmatter" => frontmatter,
                "type" => content_type,
                "status" => status,
                "tags" => tags,
                "id" => id,
                "updated" => updated,
            ));
            
            count += 1;
        }
    }
    
    writer.commit().map_err(|e| e.to_string())?;
    
    Ok(IndexStats {
        files_indexed: count,
        duration_ms: start.elapsed().as_millis() as u64,
    })
}

#[command]
pub async fn search(query: String, filters: SearchFilters, limit: Option<usize>) -> Result<Vec<SearchResult>, String> {
    let index = get_index()?;
    let reader = index.reader().map_err(|e| e.to_string())?;
    let searcher = reader.searcher();
    
    let schema = index.schema();
    let path_field = schema.get_field("path").unwrap();
    let title_field = schema.get_field("title").unwrap();
    let content_field = schema.get_field("content").unwrap();
    let type_field = schema.get_field("type").unwrap();
    let status_field = schema.get_field("status").unwrap();
    let tags_field = schema.get_field("tags").unwrap();
    let id_field = schema.get_field("id").unwrap();
    let frontmatter_field = schema.get_field("frontmatter").unwrap();
    
    // Build query
    let mut query_parser = tantivy::query::QueryParser::for_index(&index, vec![title_field, content_field, tags_field, id_field]);
    query_parser.set_conjunction_by_default(false);
    query_parser.set_field_boost(title_field, 2.0);
    query_parser.set_field_boost(id_field, 3.0);
    query_parser.set_field_boost(tags_field, 1.5);
    
    let query = query_parser.parse_query(&query).map_err(|e| e.to_string())?;
    
    let top_docs = searcher.search(&query, &tantivy::collector::TopDocs::with_limit(limit.unwrap_or(50)))
        .map_err(|e| e.to_string())?;
    
    let mut results = Vec::new();
    
    for (score, doc_address) in top_docs {
        let doc = searcher.doc(doc_address).map_err(|e| e.to_string())?;
        
        let path = doc.get_first(path_field).unwrap().as_text().unwrap().to_string();
        let title = doc.get_first(title_field).unwrap().as_text().unwrap().to_string();
        let content_type = doc.get_first(type_field).unwrap().as_text().unwrap().to_string();
        let status = doc.get_first(status_field).unwrap().as_text().unwrap().to_string();
        let tags = doc.get_first(tags_field).unwrap().as_text().unwrap().to_string();
        let id = doc.get_first(id_field).unwrap().as_text().unwrap().to_string();
        let frontmatter = doc.get_first(frontmatter_field).unwrap().as_json().unwrap();
        
        let tags_vec: Vec<String> = tags.split(' ').filter(|s| !s.is_empty()).map(|s| s.to_string()).collect();
        
        // Apply filters
        if let Some(types) = &filters.types {
            if !types.contains(&content_type) { continue; }
        }
        if let Some(statuses) = &filters.statuses {
            if !statuses.contains(&status) { continue; }
        }
        if let Some(tags) = &filters.tags {
            if !tags.iter().any(|t| tags_vec.contains(t)) { continue; }
        }
        if let Some(paths) = &filters.paths {
            if !paths.iter().any(|p| path.starts_with(p)) { continue; }
        }
        
        results.push(SearchResult {
            path,
            title,
            content_type,
            status,
            tags: tags_vec,
            id,
            score,
            highlights: SearchHighlights { content: None, title: None },
        });
    }
    
    Ok(results)
}

#[command]
pub async fn suggest(prefix: String, field: Option<String>) -> Result<Vec<String>, String> {
    let index = get_index()?;
    let schema = index.schema();
    
    let target_field = match field.as_deref() {
        Some("title") => schema.get_field("title").unwrap(),
        Some("tags") => schema.get_field("tags").unwrap(),
        Some("id") => schema.get_field("id").unwrap(),
        _ => schema.get_field("title").unwrap(),
    };
    
    let reader = index.reader().map_err(|e| e.to_string())?;
    let searcher = reader.searcher();
    
    let terms: Vec<String> = searcher.index().fields()
        .into_iter()
        .filter(|(_, field)| field.field_type().is_str())
        .filter_map(|(name, _)| {
            if name.starts_with(&prefix) {
                Some(name)
            } else {
                None
            }
        })
        .take(10)
        .collect();
    
    Ok(terms)
}