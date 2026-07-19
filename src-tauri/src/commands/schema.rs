use tauri::command;
use serde::{Deserialize, Serialize};
use jsonschema::{JSONSchema, ValidationError};
use std::collections::HashMap;

#[derive(Debug, Serialize)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<ValidationErrorItem>,
}

#[derive(Debug, Serialize)]
pub struct ValidationErrorItem {
    pub path: String,
    pub message: String,
    pub keyword: String,
}

#[command]
pub async fn validate(frontmatter: serde_json::Value, schema: String) -> Result<ValidationResult, String> {
    let schema_path = std::env::current_dir().map_err(|e| e.to_string())?.join(".markview/schemas").join(&schema);
    let schema_content = std::fs::read_to_string(&schema_path).map_err(|e| e.to_string())?;
    let schema_json: serde_json::Value = serde_json::from_str(&schema_content).map_err(|e| e.to_string())?;
    
    let compiled = JSONSchema::compile(&schema_json).map_err(|e| e.to_string())?;
    let result = compiled.validate(&frontmatter);
    
    let errors = match result {
        Ok(_) => Vec::new(),
        Err(errors) => errors.into_iter().map(|e| ValidationErrorItem {
            path: e.instance_path.to_string(),
            message: e.to_string(),
            keyword: e.keyword.to_string(),
        }).collect(),
    };
    
    Ok(ValidationResult {
        valid: errors.is_empty(),
        errors,
    })
}

#[command]
pub async fn list() -> Result<Vec<String>, String> {
    let schema_dir = std::env::current_dir().map_err(|e| e.to_string())?.join(".markview/schemas");
    
    if !schema_dir.exists() {
        return Ok(Vec::new());
    }
    
    let mut schemas = Vec::new();
    for entry in std::fs::read_dir(&schema_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().map_or(false, |e| e == "json") {
            if let Some(name) = path.file_stem().and_then(|s| s.to_str()) {
                schemas.push(name.to_string());
            }
        }
    }
    
    Ok(schemas)
}