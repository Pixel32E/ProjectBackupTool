mod archive;
mod blocklist;
mod commands;
mod config;
mod kdeconnect;
mod records;
mod tags;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::load_config,
            commands::save_config,
            commands::choose_root,
            commands::list_projects,
            commands::set_project_tag,
            commands::block_project,
            commands::list_blocked,
            commands::unblock_project,
            commands::list_backups,
            commands::backup_project,
            commands::restore_backup,
            commands::delete_backup,
            commands::rename_backup,
            commands::reveal_path,
            commands::list_devices,
            commands::send_to_device
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}