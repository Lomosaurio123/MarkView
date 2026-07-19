use tauri::command;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct Template {
    pub name: String,
    pub content: String,
    pub variables: Vec<TemplateVariable>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TemplateVariable {
    pub name: String,
    pub var_type: String,
    pub default: Option<serde_json::Value>,
    pub options: Option<Vec<String>>,
    pub required: bool,
    pub description: Option<String>,
}

#[command]
pub async fn list() -> Result<Vec<Template>, String> {
    let mut templates = Vec::new();
    
    // Built-in templates
    templates.push(Template {
        name: "spec.md".to_string(),
        content: include_str!("../../templates/spec.md.tera").to_string(),
        variables: vec![
            TemplateVariable { name: "spec_id".to_string(), var_type: "string".to_string(), default: None, options: None, required: true, description: Some("Auto-generated spec ID".to_string()) },
            TemplateVariable { name: "title".to_string(), var_type: "string".to_string(), default: None, options: None, required: true, description: Some("Spec title".to_string()) },
            TemplateVariable { name: "type".to_string(), var_type: "select".to_string(), default: Some(serde_json::json!("requirement")), options: Some(vec!["vision".to_string(), "requirement".to_string(), "design".to_string(), "task".to_string(), "adr".to_string(), "glossary".to_string()]), required: true, description: Some("Spec type".to_string()) },
            TemplateVariable { name: "status".to_string(), var_type: "select".to_string(), default: Some(serde_json::json!("draft")), options: Some(vec!["draft".to_string(), "review".to_string(), "approved".to_string(), "implemented".to_string(), "deprecated".to_string(), "archived".to_string()]), required: false, description: Some("Spec status".to_string()) },
            TemplateVariable { name: "priority".to_string(), var_type: "select".to_string(), default: Some(serde_json::json!("P2")), options: Some(vec!["P0".to_string(), "P1".to_string(), "P2".to_string(), "P3".to_string()]), required: false, description: Some("Priority level".to_string()) },
            TemplateVariable { name: "tags".to_string(), var_type: "array".to_string(), default: Some(serde_json::json!([])), options: None, required: false, description: Some("Tags".to_string()) },
            TemplateVariable { name: "author".to_string(), var_type: "string".to_string(), default: None, options: None, required: false, description: Some("Author name".to_string()) },
            TemplateVariable { name: "date".to_string(), var_type: "date".to_string(), default: Some(serde_json::json!(chrono::Utc::now().format("%Y-%m-%d").to_string())), options: None, required: false, description: Some("Creation date".to_string()) },
        ],
        description: Some("Base specification template".to_string()),
    });
    
    templates.push(Template {
        name: "requirement.md".to_string(),
        content: include_str!("../../templates/requirement.md.tera").to_string(),
        variables: vec![],
        description: Some("Requirement specification template".to_string()),
    });
    
    templates.push(Template {
        name: "design.md".to_string(),
        content: include_str!("../../templates/design.md.tera").to_string(),
        variables: vec![],
        description: Some("Design specification template".to_string()),
    });
    
    templates.push(Template {
        name: "task.md".to_string(),
        content: include_str!("../../templates/task.md.tera").to_string(),
        variables: vec![],
        description: Some("Task specification template".to_string()),
    });
    
    templates.push(Template {
        name: "adr.md".to_string(),
        content: include_str!("../../templates/adr.md.tera").to_string(),
        variables: vec![],
        description: Some("Architecture Decision Record template".to_string()),
    });
    
    // Load user templates from .markview/templates
    let template_dir = std::env::current_dir().unwrap().join(".markview/templates");
    if template_dir.exists() {
        for entry in std::fs::read_dir(&template_dir).unwrap_or_default().filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.extension().map_or(false, |e| e == "tera" || e == "jinja2" || e == "md") {
                if let Ok(content) = std::fs::read_to_string(&path) {
                    let name = path.file_stem().unwrap().to_string_lossy().to_string();
                    templates.push(Template {
                        name,
                        content: content.clone(),
                        variables: extract_variables(&content),
                        description: None,
                    });
                }
            }
        }
    }
    
    Ok(templates)
}

fn extract_variables(content: &str) -> Vec<TemplateVariable> {
    let re = regex::Regex::new(r"\{\{\s*(\w+)\s*\}\}").unwrap();
    let mut variables = Vec::new();
    
    for cap in re.captures_iter(content) {
        if let Some(var_name) = cap.get(1) {
            let name = var_name.as_str().to_string();
            if !variables.iter().any(|v: &TemplateVariable| v.name == name) {
                variables.push(TemplateVariable {
                    name,
                    var_type: "string".to_string(),
                    default: None,
                    options: None,
                    required: false,
                    description: None,
                });
            }
        }
    }
    
    variables
}

#[command]
pub async fn render(name: String, vars: serde_json::Value) -> Result<String, String> {
    let template_content = match name.as_str() {
        "spec.md" => include_str!("../../templates/spec.md.tera"),
        "requirement.md" => include_str!("../../templates/requirement.md.tera"),
        "design.md" => include_str!("../../templates/design.md.tera"),
        "task.md" => include_str!("../../templates/task.md.tera"),
        "adr.md" => include_str!("../../templates/adr.md.tera"),
        _ => {
            // Try to load from user templates
            let path = std::env::current_dir().unwrap().join(".markview/templates").join(&name);
            if path.exists() {
                return std::fs::read_to_string(&path).map_err(|e| e.to_string());
            }
            return Err(format!("Template not found: {}", name));
        }
    };
    
    let tera = tera::Tera::default();
    let mut context = tera::Context::new();
    
    // Add defaults
    context.insert("spec_id", &format!("REQ-{:03}", rand::random::<u32>() % 1000));
    context.insert("date", &chrono::Utc::now().format("%Y-%m-%d").to_string());
    context.insert("datetime", &chrono::Utc::now().to_rfc3339());
    context.insert("author", &get_git_user().unwrap_or_default());
    context.insert("project_name", "MyProject");
    
    // Add user variables
    if let Some(obj) = vars.as_object() {
        for (k, v) in obj {
            context.insert(k, v);
        }
    }
    
    tera.render_str(template_content, &context).map_err(|e| e.to_string())
}

#[command]
pub async fn create(name: String, content: String) -> Result<Template, String> {
    let template_dir = std::env::current_dir().unwrap().join(".markview/templates");
    std::fs::create_dir_all(&template_dir).map_err(|e| e.to_string())?;
    
    let path = template_dir.join(format!("{}.tera", name));
    std::fs::write(&path, &content).map_err(|e| e.to_string())?;
    
    Ok(Template {
        name: name.clone(),
        content,
        variables: extract_variables(&content),
        description: None,
    })
}

#[command]
pub async fn delete(name: String) -> Result<(), String> {
    let path = std::env::current_dir().unwrap().join(".markview/templates").join(format!("{}.tera", name));
    if path.exists() {
        std::fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn get_git_user() -> Option<String> {
    git2::Config::open_default().ok()?.get_string("user.name").ok()
}