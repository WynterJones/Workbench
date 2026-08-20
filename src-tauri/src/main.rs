// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    if std::env::args().nth(1).as_deref() == Some("mcp") {
        if let Err(error) = workbench_lib::mcp_server::serve() {
            eprintln!("workbench mcp: {error}");
            std::process::exit(1);
        }
        return;
    }
    workbench_lib::run()
}
