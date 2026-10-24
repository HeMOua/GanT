#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod storage;
use std::sync::Mutex;
use tauri::Manager;

#[tauri::command]
fn local_request(
    state: tauri::State<Mutex<rusqlite::Connection>>,
    method: String,
    path: String,
    data: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let mut db = state.lock().map_err(|_| "本地数据库暂不可用")?;
    storage::request(
        &mut db,
        &method,
        &path,
        data.unwrap_or(serde_json::json!({})),
    )
}
#[tauri::command]
async fn backup_workspace(
    state: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<String, String> {
    let file = rfd::AsyncFileDialog::new()
        .set_file_name(format!(
            "GanT-{}.sqlite3",
            chrono::Local::now().format("%Y%m%d-%H%M%S")
        ))
        .add_filter("SQLite 备份", &["sqlite3"])
        .save_file()
        .await;
    let Some(file) = file else {
        return Ok(String::new());
    };
    if file.path().exists() {
        return Err("请使用新的备份文件名".into());
    }
    let db = state.lock().map_err(|_| "数据库暂不可用")?;
    db.execute("VACUUM INTO ?1", [file.path().to_string_lossy().as_ref()])
        .map_err(|_| "无法写入备份")?;
    Ok("备份已保存".into())
}
#[tauri::command]
async fn confirm_action(window: tauri::WebviewWindow, message: String) -> bool {
    rfd::AsyncMessageDialog::new()
        .set_parent(&window)
        .set_title("GanT")
        .set_description(message)
        .set_level(rfd::MessageLevel::Warning)
        .set_buttons(rfd::MessageButtons::OkCancelCustom(
            "继续".into(),
            "取消".into(),
        ))
        .show()
        .await
        == rfd::MessageDialogResult::Custom("继续".into())
}
#[tauri::command]
async fn show_message(window: tauri::WebviewWindow, message: String) {
    rfd::AsyncMessageDialog::new()
        .set_parent(&window)
        .set_title("GanT")
        .set_description(message)
        .show()
        .await;
}
fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            let db = storage::open(&dir.join("gant.sqlite3"))?;
            app.manage(Mutex::new(db));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            local_request,
            backup_workspace,
            confirm_action,
            show_message
        ])
        .run(tauri::generate_context!())
        .expect("无法启动 GanT");
}
