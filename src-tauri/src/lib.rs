use tauri::Manager;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
};

#[cfg(target_os = "windows")]
use windows::Win32::Graphics::Dwm::{DwmSetWindowAttribute, DWMWA_CAPTION_COLOR};
#[cfg(target_os = "windows")]
use windows::Win32::Foundation::{HWND, COLORREF};
#[cfg(target_os = "windows")]
use std::os::windows::ffi::OsStrExt;
#[cfg(target_os = "windows")]
use windows::Win32::Graphics::Printing::{
    ClosePrinter, EndDocPrinter, EndPagePrinter, OpenPrinterW, StartDocPrinterW, StartPagePrinter,
    WritePrinter, DOC_INFO_1W, PRINTER_DEFAULTSW, PRINTER_ACCESS_USE, PRINTER_HANDLE
};
#[cfg(target_os = "windows")]
use windows::core::{PCWSTR, PWSTR};

#[tauri::command]
fn set_titlebar_color(window: tauri::Window, color: String) {
    #[cfg(target_os = "windows")]
    {
        if color.len() == 7 && color.starts_with('#') {
            let r = u8::from_str_radix(&color[1..3], 16).unwrap_or(0);
            let g = u8::from_str_radix(&color[3..5], 16).unwrap_or(0);
            let b = u8::from_str_radix(&color[5..7], 16).unwrap_or(0);
            
            let color_ref = COLORREF((b as u32) << 16 | (g as u32) << 8 | (r as u32));
            
            if let Ok(hwnd) = window.hwnd() {
                let hwnd_val = hwnd.0 as *mut core::ffi::c_void;
                let hwnd_win32 = HWND(hwnd_val);
                unsafe {
                    let _ = DwmSetWindowAttribute(
                        hwnd_win32,
                        DWMWA_CAPTION_COLOR,
                        &color_ref as *const _ as *const core::ffi::c_void,
                        std::mem::size_of::<COLORREF>() as u32,
                    );
                }
            }
        }
    }
}

#[tauri::command]
fn print_raw_data(printer_name: String, data: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        unsafe {
            let mut printer_name_wide: Vec<u16> = std::ffi::OsStr::new(&printer_name)
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();

            let mut h_printer = PRINTER_HANDLE::default();
            
            let mut defaults = PRINTER_DEFAULTSW {
                pDatatype: PWSTR::null(),
                pDevMode: std::ptr::null_mut(),
                DesiredAccess: PRINTER_ACCESS_USE,
            };

            let res = OpenPrinterW(
                PCWSTR(printer_name_wide.as_ptr()),
                &mut h_printer,
                Some(&mut defaults),
            );

            if res.is_err() {
                return Err(format!("Failed to open printer: {}", printer_name));
            }

            let mut doc_name: Vec<u16> = std::ffi::OsStr::new("ZINC Raw Print Job")
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();
                
            let mut data_type: Vec<u16> = std::ffi::OsStr::new("RAW")
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();

            let doc_info = DOC_INFO_1W {
                pDocName: PWSTR(doc_name.as_mut_ptr()),
                pOutputFile: PWSTR::null(),
                pDatatype: PWSTR(data_type.as_mut_ptr()),
            };

            let job_id = StartDocPrinterW(h_printer, 1, &doc_info as *const _ as *const DOC_INFO_1W);
            if job_id == 0 {
                let _ = ClosePrinter(h_printer);
                return Err("Failed to start document".to_string());
            }

            if StartPagePrinter(h_printer).as_bool() == false {
                let _ = EndDocPrinter(h_printer);
                let _ = ClosePrinter(h_printer);
                return Err("Failed to start page".to_string());
            }

            let bytes = data.as_bytes();
            let mut bytes_written = 0;
            
            let write_res = WritePrinter(
                h_printer,
                bytes.as_ptr() as *const core::ffi::c_void,
                bytes.len() as u32,
                &mut bytes_written,
            );

            let _ = EndPagePrinter(h_printer);
            let _ = EndDocPrinter(h_printer);
            let _ = ClosePrinter(h_printer);

            if write_res.as_bool() == false || bytes_written != bytes.len() as u32 {
                return Err("Failed to write data to printer".to_string());
            }

            Ok(())
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Raw printing is only supported on Windows".to_string())
    }
}

#[tauri::command]
async fn update_tray_language(app: tauri::AppHandle, lang: String) -> Result<(), String> {
    let show_text = if lang == "EN" { "Open ZINC" } else { "فتح ZINC" };
    let quit_text = if lang == "EN" { "Quit" } else { "إغلاق" };
    let tooltip = if lang == "EN" { "ZINC - Pharmacy Management System" } else { "ZINC - نظام إدارة الصيدليات" };

    if let Some(tray) = app.tray_by_id("main_tray") {
        let _ = tray.set_tooltip(Some(tooltip));
        
        if let Ok(show) = tauri::menu::MenuItem::with_id(&app, "show", show_text, true, None::<&str>) {
            if let Ok(quit) = tauri::menu::MenuItem::with_id(&app, "quit", quit_text, true, None::<&str>) {
                if let Ok(menu) = tauri::menu::Menu::with_items(&app, &[&show, &quit]) {
                    let _ = tray.set_menu(Some(menu));
                }
            }
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_thermal_printer::init())
        .invoke_handler(tauri::generate_handler![set_titlebar_color, print_raw_data, update_tray_language])
        .setup(|app| {
            // Debug-only logging
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // System Tray Setup
            let quit = MenuItem::with_id(app, "quit", "إغلاق", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "فتح", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            let mut builder = TrayIconBuilder::with_id("main_tray")
                .menu(&menu)
                .tooltip("ZINC - نظام إدارة الصيدليات")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                });

            if let Some(icon) = app.default_window_icon() {
                builder = builder.icon(icon.clone());
            }

            builder.build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
