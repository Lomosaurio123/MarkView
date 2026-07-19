use std::env;
use std::path::PathBuf;

fn main() {
    // Tell cargo to rerun if these files change
    println!("cargo:rerun-if-changed=templates/");
    println!("cargo:rerun-if-changed=schemas/");
    println!("cargo:rerun-if-changed=export-templates/");
    println!("cargo:rerun-if-changed=icons/icon.png");

    // Copy templates to target directory for bundling
    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
    let templates_dir = out_dir.join("templates");
    std::fs::create_dir_all(&templates_dir).unwrap();
    
    // Copy templates
    for entry in std::fs::read_dir("templates").unwrap() {
        let entry = entry.unwrap();
        let dest = templates_dir.join(entry.file_name());
        std::fs::copy(entry.path(), dest).unwrap();
    }
}