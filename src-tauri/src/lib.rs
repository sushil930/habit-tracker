#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use std::sync::atomic::{AtomicBool, Ordering};
    use tauri::{Emitter, Manager, WindowEvent};
    use tauri::menu::{Menu, MenuItem};
    use tauri::tray::{TrayIconBuilder, TrayIconEvent};

    struct AppState {
        quitting: AtomicBool,
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .manage(AppState {
            quitting: AtomicBool::new(false),
        })
        .setup(|app| {
            // Tray icon + menu
            let open_item = MenuItem::with_id(app, "open", "Open", true, None::<&str>)?;
            let add_item = MenuItem::with_id(app, "add_habit", "Add Habit", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&open_item, &add_item, &quit_item])?;

            TrayIconBuilder::with_id("habitflow-tray")
                .icon(app.default_window_icon().ok_or("missing default window icon")?.clone())
                .menu(&tray_menu)
                .on_menu_event(move |app, event| {
                    let id = event.id().as_ref();

                    if id == "open" {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    } else if id == "add_habit" {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                            let _ = w.emit("tray:add-habit", ());
                        }
                    } else if id == "quit" {
                        // Allow next close to actually quit
                        let state = app.state::<AppState>();
                        state.quitting.store(true, Ordering::SeqCst);
                        app.exit(0);
                    }
                })
                .on_tray_icon_event(move |tray, event| {
                    if let TrayIconEvent::Click { .. } = event {
                        if let Some(w) = tray.app_handle().get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                })
                .build(app)?;

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            Ok(())
        })
        // Close button => minimize to tray (hide) unless quitting.
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let state = window.state::<AppState>();
                if !state.quitting.load(Ordering::SeqCst) {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
