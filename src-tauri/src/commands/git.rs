use tauri::command;
use serde::{Deserialize, Serialize};
use git2::{Repository, StatusOptions, DiffOptions, DiffFormat, BlameOptions};
use std::path::Path;

#[derive(Debug, Serialize)]
pub struct Commit {
    pub hash: String,
    pub short_hash: String,
    pub message: String,
    pub author: String,
    pub email: String,
    pub date: String,
    pub parents: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct BlameLine {
    pub line: usize,
    pub hash: String,
    pub short_hash: String,
    pub author: String,
    pub date: String,
    pub summary: String,
}

#[derive(Debug, Serialize)]
pub struct DiffHunk {
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub lines: Vec<DiffLine>,
}

#[derive(Debug, Serialize)]
pub struct DiffLine {
    pub line_type: String,
    pub content: String,
    pub old_line_number: Option<u32>,
    pub new_line_number: Option<u32>,
}

#[derive(Debug, Serialize)]
pub struct GitStatus {
    pub current_branch: String,
    pub ahead: usize,
    pub behind: usize,
    pub files: Vec<GitFileStatus>,
}

#[derive(Debug, Serialize)]
pub struct GitFileStatus {
    pub path: String,
    pub index_status: String,
    pub worktree_status: String,
}

fn open_repo() -> Result<Repository, String> {
    let path = std::env::current_dir().map_err(|e| e.to_string())?;
    Repository::discover(&path).map_err(|e| e.to_string())
}

#[command]
pub async fn log(path: Option<String>, limit: Option<usize>, since: Option<String>) -> Result<Vec<Commit>, String> {
    let repo = open_repo()?;
    let mut revwalk = repo.revwalk().map_err(|e| e.to_string())?;
    revwalk.set_sorting(git2::Sort::TIME).map_err(|e| e.to_string())?;
    revwalk.push_head().map_err(|e| e.to_string())?;
    
    let mut commits = Vec::new();
    let limit = limit.unwrap_or(50);
    
    for oid in revwalk.take(limit) {
        let oid = oid.map_err(|e| e.to_string())?;
        let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;
        
        commits.push(Commit {
            hash: commit.id().to_string(),
            short_hash: commit.id().to_string()[..7].to_string(),
            message: commit.message().unwrap_or("").lines().next().unwrap_or("").to_string(),
            author: commit.author().name().unwrap_or("").to_string(),
            email: commit.author().email().unwrap_or("").to_string(),
            date: commit.time().seconds().to_string(),
            parents: commit.parents().map(|p| p.id().to_string()).collect(),
        });
    }
    
    Ok(commits)
}

#[command]
pub async fn blame(path: String) -> Result<Vec<BlameLine>, String> {
    let repo = open_repo()?;
    let mut blame_opts = BlameOptions::new();
    
    let blame = repo.blame_file(Path::new(&path), Some(&mut blame_opts)).map_err(|e| e.to_string())?;
    
    let mut lines = Vec::new();
    for hunk in blame.iter() {
        let signature = hunk.final_signature();
        let commit = repo.find_commit(hunk.final_commit_id()).ok();
        
        for line in hunk.lines_in_hunk() {
            lines.push(BlameLine {
                line: line.final_line_number as usize,
                hash: hunk.final_commit_id().to_string(),
                short_hash: hunk.final_commit_id().to_string()[..7].to_string(),
                author: signature.name().unwrap_or("").to_string(),
                date: signature.when().seconds().to_string(),
                summary: commit.as_ref().and_then(|c| c.summary()).unwrap_or("").to_string(),
            });
        }
    }
    
    Ok(lines)
}

#[command]
pub async fn diff(path: String, base: Option<String>, head: Option<String>) -> Result<Vec<DiffHunk>, String> {
    let repo = open_repo()?;
    
    let head_commit = if let Some(head) = head {
        repo.revparse_single(&head).map_err(|e| e.to_string())?.peel_to_commit().map_err(|e| e.to_string())?
    } else {
        repo.head().map_err(|e| e.to_string())?.peel_to_commit().map_err(|e| e.to_string())?
    };
    
    let base_commit = if let Some(base) = base {
        repo.revparse_single(&base).map_err(|e| e.to_string())?.peel_to_commit().map_err(|e| e.to_string())?
    } else {
        head_commit.parent(0).map_err(|e| e.to_string())?
    };
    
    let head_tree = head_commit.tree().map_err(|e| e.to_string())?;
    let base_tree = base_commit.tree().map_err(|e| e.to_string())?;
    
    let mut diff_opts = DiffOptions::new();
    diff_opts.pathspec(path);
    
    let diff = repo.diff_tree_to_tree(Some(&base_tree), Some(&head_tree), Some(&mut diff_opts)).map_err(|e| e.to_string())?;
    
    let mut hunks = Vec::new();
    
    diff.foreach(
        &mut |_delta, _progress| true,
        None,
        Some(&mut |hunk| {
            hunks.push(DiffHunk {
                old_start: hunk.old_start(),
                old_lines: hunk.old_lines(),
                new_start: hunk.new_start(),
                new_lines: hunk.new_lines(),
                lines: Vec::new(),
            });
            true
        }),
        Some(&mut |_delta, _hunk, line| {
            if let Some(last_hunk) = hunks.last_mut() {
                last_hunk.lines.push(DiffLine {
                    line_type: match line.origin() {
                        '+' => "add".to_string(),
                        '-' => "delete".to_string(),
                        _ => "context".to_string(),
                    },
                    content: String::from_utf8_lossy(line.content()).to_string(),
                    old_line_number: if line.old_lineno() > 0 { Some(line.old_lineno()) } else { None },
                    new_line_number: if line.new_lineno() > 0 { Some(line.new_lineno()) } else { None },
                });
            }
            true
        }),
    ).map_err(|e| e.to_string())?;
    
    Ok(hunks)
}

#[command]
pub async fn status(path: Option<String>) -> Result<GitStatus, String> {
    let repo = open_repo()?;
    
    let head = repo.head().ok();
    let branch_name = head.as_ref()
        .and_then(|h| h.shorthand())
        .unwrap_or("detached")
        .to_string();
    
    let mut status_opts = StatusOptions::new();
    status_opts.include_untracked(true);
    status_opts.recurse_untracked_dirs(true);
    
    let statuses = repo.statuses(Some(&mut status_opts)).map_err(|e| e.to_string())?;
    
    let mut files = Vec::new();
    for entry in statuses.iter() {
        let path = entry.path().unwrap_or("").to_string();
        let status = entry.status();
        
        files.push(GitFileStatus {
            path,
            index_status: format_status(status.index()),
            worktree_status: format_status(status.worktree()),
        });
    }
    
    // Calculate ahead/behind
    let (ahead, behind) = if let Some(head) = head {
        let upstream = head.upstream().ok();
        if let Some(upstream) = upstream {
            let (ahead_count, behind_count) = repo.graph_ahead_behind(head.target().unwrap(), upstream.target().unwrap()).unwrap_or((0, 0));
            (ahead_count, behind_count)
        } else {
            (0, 0)
        }
    } else {
        (0, 0)
    };
    
    Ok(GitStatus {
        current_branch: branch_name,
        ahead,
        behind,
        files,
    })
}

fn format_status(status: git2::Status) -> String {
    let mut parts = Vec::new();
    if status.contains(git2::Status::INDEX_NEW) { parts.push("added"); }
    if status.contains(git2::Status::INDEX_MODIFIED) { parts.push("modified"); }
    if status.contains(git2::Status::INDEX_DELETED) { parts.push("deleted"); }
    if status.contains(git2::Status::INDEX_RENAMED) { parts.push("renamed"); }
    if status.contains(git2::Status::INDEX_TYPECHANGE) { parts.push("typechange"); }
    if status.contains(git2::Status::WT_NEW) { parts.push("untracked"); }
    if status.contains(git2::Status::WT_MODIFIED) { parts.push("modified"); }
    if status.contains(git2::Status::WT_DELETED) { parts.push("deleted"); }
    if status.contains(git2::Status::WT_RENAMED) { parts.push("renamed"); }
    if status.contains(git2::Status::WT_TYPECHANGE) { parts.push("typechange"); }
    if status.contains(git2::Status::IGNORED) { parts.push("ignored"); }
    if parts.is_empty() { parts.push("unmodified"); }
    parts.join(",")
}