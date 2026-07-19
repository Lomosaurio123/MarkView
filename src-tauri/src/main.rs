mod commands;

use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            // File system
            commands::fs::read_dir,
            commands::fs::read_file,
            commands::fs::write_file,
            commands::fs::create_file,
            commands::fs::delete,
            commands::fs::rename,
            // Search
            commands::search::index,
            commands::search::search,
            commands::search::suggest,
            // Git
            commands::git::log,
            commands::git::blame,
            commands::git::diff,
            commands::git::status,
            // Templates
            commands::templates::list_templates,
            commands::templates::render,
            commands::templates::create,
            commands::templates::delete_template,
            // Export
            commands::export::to_pdf,
            commands::export::to_html,
            commands::export::to_docx,
            // Schema
            commands::schema::validate,
            commands::schema::list_schemas,
            // Config
            commands::config::load,
            commands::config::save,
            // Graph
            commands::graph::build,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}