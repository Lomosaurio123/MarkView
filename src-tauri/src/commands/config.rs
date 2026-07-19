use tauri::command;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Config {
    pub project: ProjectConfig,
    pub structure: StructureConfig,
    pub schemas: SchemasConfig,
    pub templates: TemplatesConfig,
    pub search: SearchConfig,
    pub git: GitConfig,
    pub export: ExportConfig,
    pub editor: EditorConfig,
    pub preview: PreviewConfig,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectConfig {
    pub name: String,
    pub root: String,
    pub index_file: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StructureConfig {
    pub mode: String,
    pub feature_prefixes: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SchemasConfig {
    pub spec: String,
    pub requirement: Option<String>,
    pub design: Option<String>,
    pub task: Option<String>,
    pub adr: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TemplatesConfig {
    pub dir: String,
    pub default: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchConfig {
    pub enabled: bool,
    pub index_path: String,
    pub watch: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitConfig {
    pub enabled: bool,
    pub blame_enabled: bool,
    pub diff_algorithm: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExportConfig {
    pub pandoc_path: String,
    pub default_format: String,
    pub templates_dir: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EditorConfig {
    pub font_size: u32,
    pub font_family: String,
    pub tab_size: u32,
    pub vim_mode: bool,
    pub vim_leader: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PreviewConfig {
    pub sync_scroll: bool,
    pub theme: String,
    pub mermaid: bool,
    pub math: bool,
}

fn config_path() -> PathBuf {
    std::env::current_dir().unwrap().join(".markview/config.toml")
}

#[command]
pub async fn load(project_path: Option<String>) -> Result<Config, String> {
    let path = if let Some(p) = project_path {
        PathBuf::from(p).join(".markview/config.toml")
    } else {
        config_path()
    };
    
    if !path.exists() {
        return Ok(default_config());
    }
    
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let config: Config = toml::from_str(&content).map_err(|e| e.to_string())?;
    Ok(config)
}

#[command]
pub async fn save(config: Config) -> Result<(), String> {
    let path = config_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    
    let content = toml::to_string_pretty(&config).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

fn default_config() -> Config {
    Config {
        project: ProjectConfig {
            name: "MyProject Specs".to_string(),
            root: "specs".to_string(),
            index_file: "index.md".to_string(),
        },
        structure: StructureConfig {
            mode: "feature".to_string(),
            feature_prefixes: Some(vec![
                "00-foundation".to_string(),
                "01-auth".to_string(),
                "02-payments".to_string(),
                "99-archive".to_string(),
            ]),
        },
        schemas: SchemasConfig {
            spec: "schemas/spec.schema.json".to_string(),
            requirement: Some("schemas/requirement.schema.json".to_string()),
            design: Some("schemas/design.schema.json".to_string()),
            task: Some("schemas/task.schema.json".to_string()),
            adr: Some("schemas/adr.schema.json".to_string()),
        },
        templates: TemplatesConfig {
            dir: "templates".to_string(),
            default: "spec.md.tera".to_string(),
        },
        search: SearchConfig {
            enabled: true,
            index_path: ".markview/index.tantivy".to_string(),
            watch: true,
        },
        git: GitConfig {
            enabled: true,
            blame_enabled: true,
            diff_algorithm: "patience".to_string(),
        },
        export: ExportConfig {
            pandoc_path: "pandoc".to_string(),
            default_format: "pdf".to_string(),
            templates_dir: "export-templates".to_string(),
        },
        editor: EditorConfig {
            font_size: 14,
            font_family: "JetBrains Mono".to_string(),
            tab_size: 2,
            vim_mode: false,
            vim_leader: " ".to_string(),
        },
        preview: PreviewConfig {
            sync_scroll: true,
            theme: "github-light".to_string(),
            mermaid: true,
            math: true,
        },
    }
}