use std::io::Read;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::OnceLock;
use std::thread::sleep;
use std::time::{Duration, Instant};

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct Device {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct DeviceListResult {
    /// 是否找到 kdeconnect-cli
    pub cli_found: bool,
    pub devices: Vec<Device>,
}

static CLI_PATH: OnceLock<Option<PathBuf>> = OnceLock::new();

fn exe_name() -> &'static str {
    if cfg!(windows) {
        "kdeconnect-cli.exe"
    } else {
        "kdeconnect-cli"
    }
}

/// 查找 kdeconnect-cli：先搜索 PATH，再尝试常见安装位置，结果缓存。
pub fn find_cli() -> Option<PathBuf> {
    CLI_PATH
        .get_or_init(|| {
            let exe = exe_name();

            if let Some(path_env) = std::env::var_os("PATH") {
                for dir in std::env::split_paths(&path_env) {
                    let candidate = dir.join(exe);
                    if candidate.is_file() {
                        return Some(candidate);
                    }
                }
            }

            let mut candidates: Vec<PathBuf> = Vec::new();
            if let Some(program_files) = std::env::var_os("ProgramFiles") {
                candidates.push(PathBuf::from(program_files).join("KDE Connect/bin").join(exe));
            }
            if let Some(program_files_x86) = std::env::var_os("ProgramFiles(x86)") {
                candidates.push(PathBuf::from(program_files_x86).join("KDE Connect/bin").join(exe));
            }
            if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
                let base = PathBuf::from(local_app_data);
                candidates.push(base.join("KDE Connect/bin").join(exe));
                candidates.push(base.join("Programs/KDE Connect/bin").join(exe));
            }

            candidates.into_iter().find(|path| path.is_file())
        })
        .clone()
}

/// 列出已配对且在线可达的设备。
pub fn list_devices() -> Result<DeviceListResult, String> {
    if find_cli().is_none() {
        return Ok(DeviceListResult {
            cli_found: false,
            devices: Vec::new(),
        });
    }

    // 先触发一次设备发现，避免列表过期；失败不影响后续查询
    let _ = run_cli(&["--refresh"], Some(Duration::from_secs(5)));

    let (_, output) = run_cli(&["--list-available"], Some(Duration::from_secs(10)))
        .map_err(|e| format!("设备检测失败：{e}"))?;

    Ok(DeviceListResult {
        cli_found: true,
        devices: parse_devices(&output),
    })
}

/// 通过 kdeconnect-cli 分享文件到指定设备（设备需已配对且在线）。
pub fn send_file(device_id: &str, file_path: &str) -> Result<bool, String> {
    let (code, _) = run_cli(&["-d", device_id, "--share", file_path], None)?;
    Ok(code == 0)
}

/// 解析 `--list-available` 输出中以 "- " 开头的设备行。
///
/// 兼容中英文两种格式：
/// - 中文：`- 名称: 设备ID on 192.168.x.x via LAN (已配对且可访问)`
/// - 英文：`- 名称: 设备ID (paired, reachable)`
fn parse_devices(output: &str) -> Vec<Device> {
    let mut devices = Vec::new();

    for line in output.lines() {
        let Some(rest) = line.trim().strip_prefix("- ") else {
            continue;
        };
        // 名称中可能包含冒号，取最后一个冒号作为分隔
        let Some((name, tail)) = rest.rsplit_once(':') else {
            continue;
        };
        let Some(id) = tail.split_whitespace().next() else {
            continue;
        };
        if id.is_empty() {
            continue;
        }

        let paired = (line.contains("已配对") || line.to_lowercase().contains("paired"))
            && !line.contains("未配对")
            && !line.to_lowercase().contains("not paired");
        let reachable = (line.contains("可访问") || line.to_lowercase().contains("reachable"))
            && !line.contains("不可访问")
            && !line.to_lowercase().contains("not reachable");

        if paired && reachable {
            devices.push(Device {
                id: id.to_string(),
                name: name.trim().to_string(),
            });
        }
    }

    devices
}

/// 运行 kdeconnect-cli，返回 (退出码, 标准输出)。
fn run_cli(args: &[&str], timeout: Option<Duration>) -> Result<(i32, String), String> {
    let cli = find_cli().ok_or_else(|| "未找到 kdeconnect-cli".to_string())?;

    let mut command = Command::new(&cli);
    command
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = command
        .spawn()
        .map_err(|e| format!("启动 kdeconnect-cli 失败：{e}"))?;

    let mut stdout = child.stdout.take().ok_or("无法读取命令输出")?;
    let mut stderr = child.stderr.take().ok_or("无法读取命令输出")?;

    // 单独线程读取输出，避免管道缓冲区写满导致子进程阻塞
    let stdout_reader = std::thread::spawn(move || {
        let mut buf = Vec::new();
        let _ = stdout.read_to_end(&mut buf);
        buf
    });
    let stderr_reader = std::thread::spawn(move || {
        let mut buf = Vec::new();
        let _ = stderr.read_to_end(&mut buf);
        buf
    });

    let start = Instant::now();
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) => {
                if let Some(limit) = timeout {
                    if start.elapsed() > limit {
                        let _ = child.kill();
                        let _ = child.wait();
                        return Err("kdeconnect-cli 执行超时".into());
                    }
                }
                sleep(Duration::from_millis(50));
            }
            Err(e) => return Err(format!("等待 kdeconnect-cli 失败：{e}")),
        }
    };

    let stdout_bytes = stdout_reader.join().unwrap_or_default();
    let _ = stderr_reader.join();

    Ok((
        status.code().unwrap_or(-1),
        String::from_utf8_lossy(&stdout_bytes).into_owned(),
    ))
}