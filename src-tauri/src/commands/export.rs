use tauri::command;
use serde::{Deserialize, Serialize};
use std::process::Command;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportOptions {
    pub format: String,
    pub template: Option<String>,
    pub combine: Option<bool>,
    pub toc: Option<bool>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct ExportResult {
    pub data: Vec<u8>,
    pub filename: String,
}

#[command]
pub async fn to_pdf(paths: Vec<String>, options: ExportOptions) -> Result<ExportResult, String> {
    let pandoc_path = find_pandoc()?;
    
    let mut args = vec![
        "-f".to_string(),
        "markdown".to_string(),
        "-t".to_string(),
        "pdf".to_string(),
        "--pdf-engine".to_string(),
        "weasyprint".to_string(),
    ];
    
    if options.combine.unwrap_or(false) {
        args.push("--toc".to_string());
    }
    
    if let Some(template) = options.template {
        args.push("--template".to_string());
        args.push(template);
    }
    
    if let Some(meta) = options.metadata {
        for (key, value) in meta.as_object().unwrap_or(&serde_json::Map::new()) {
            args.push("--metadata".to_string());
            args.push(format!("{}={}", key, value));
        }
    }
    
    for path in &paths {
        args.push(path.clone());
    }
    
    args.push("-o".to_string());
    let output_file = format!("export_{}.pdf", chrono::Utc::now().timestamp());
    args.push(output_file.clone());
    
    let output = Command::new(&pandoc_path)
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run pandoc: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    let data = std::fs::read(&output_file).map_err(|e| e.to_string())?;
    std::fs::remove_file(&output_file).ok();
    
    Ok(ExportResult {
        data,
        filename: output_file,
    })
}

#[command]
pub async fn to_html(paths: Vec<String>, options: ExportOptions) -> Result<String, String> {
    let pandoc_path = find_pandoc()?;
    
    let mut args = vec![
        "-f".to_string(),
        "markdown".to_string(),
        "-t".to_string(),
        "html5".to_string(),
        "--standalone".to_string(),
        "--self-contained".to_string(),
    ];
    
    if options.combine.unwrap_or(false) {
        args.push("--toc".to_string());
    }
    
    if let Some(template) = options.template {
        args.push("--template".to_string());
        args.push(template);
    }
    
    if let Some(meta) = options.metadata {
        for (key, value) in meta.as_object().unwrap_or(&serde_json::Map::new()) {
            args.push("--metadata".to_string());
            args.push(format!("{}={}", key, value));
        }
    }
    
    for path in &paths {
        args.push(path.clone());
    }
    
    let output = Command::new(&pandoc_path)
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run pandoc: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[command]
pub async fn to_docx(paths: Vec<String>, options: ExportOptions) -> Result<ExportResult, String> {
    let pandoc_path = find_pandoc()?;
    
    let mut args = vec![
        "-f".to_string(),
        "markdown".to_string(),
        "-t".to_string(),
        "docx".to_string(),
    ];
    
    if options.combine.unwrap_or(false) {
        args.push("--toc".to_string());
    }
    
    if let Some(template) = options.template {
        args.push("--reference-doc".to_string());
        args.push(template);
    }
    
    if let Some(meta) = options.metadata {
        for (key, value) in meta.as_object().unwrap_or(&serde_json::Map::new()) {
            args.push("--metadata".to_string());
            args.push(format!("{}={}", key, value));
        }
    }
    
    for path in &paths {
        args.push(path.clone());
    }
    
    args.push("-o".to_string());
    let output_file = format!("export_{}.docx", chrono::Utc::now().timestamp());
    args.push(output_file.clone());
    
    let output = Command::new(&pandoc_path)
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run pandoc: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    let data = std::fs::read(&output_file).map_err(|e| e.to_string())?;
    std::fs::remove_file(&output_file).ok();
    
    Ok(ExportResult {
        data,
        filename: output_file,
    })
}

fn find_pandoc() -> Result<String, String> {
    // Try to find pandoc in PATH or as sidecar
    if let Ok(output) = Command::new("which").arg("pandoc").output() {
        if output.status.success() {
            return Ok("pandoc".to_string());
        }
    }
    
    if let Ok(output) = Command::new("where").arg("pandoc").output() {
        if output.status.success() {
            return Ok("pandoc".to_string());
        }
    }
    
    // Check sidecar
    let sidecar = std::env::current_exe().unwrap()
        .parent().unwrap()
        .join("pandoc");
    
    if sidecar.exists() {
        return Ok(sidecar.to_string_lossy().to_string());
    }
    
    Err("Pandoc not found. Please install pandoc or include it as a sidecar.".to_string())
}