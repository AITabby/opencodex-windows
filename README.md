# OpenCodex for Windows 🚀

[English](#english) | [简体中文](#简体中文)

---

# English

**OpenCodex** is a local gateway that unlocks Codex Desktop for third-party APIs on Windows. Features a web dashboard, multi-provider routing, native Computer Use via Win32 API, and Vision Bridge.

## 🌟 Key Features

*   **Zero-Config Setup**: Start the server, it auto-patches `~/.codex/config.toml`.
*   **Web Dashboard** (`http://localhost:8765/dashboard`):
    *   🌐 Bilingual (EN/中文)
    *   🔑 Multi-provider API key management
    *   📝 Add/delete custom models
    *   📋 Live log viewer
*   **Multi-Provider Routing**: Different models use different API providers. Format: `provider:model`.
*   **Computer Use & Vision Bridge**:
    *   🖱️ Native Win32 API via C# agent (no PowerShell overhead)
    *   👁️ `sharp` image compression + multimodal description for text-only models

## 🚀 Quick Start

### Prerequisites
- Windows 10+
- Node.js v18+
- .NET 8 SDK (`winget install Microsoft.DotNet.SDK.8`)
- Codex Desktop installed

### Install & Run

```powershell
git clone https://github.com/AITabby/opencodex-windows.git
cd opencodex-windows
dotnet publish cu-agent/ -c Release
npm install
npm start
```

Open `http://localhost:8765/dashboard` in your browser. Add API providers and models, click save.

> ⚠ On Windows, after saving config you need to **manually restart Codex Desktop** for changes to take effect.

---

# 简体中文

**OpenCodex** Windows 版 — 为 Codex Desktop 解锁第三方 API。支持多供应商路由、Web 控制台、原生 Win32 Computer Use 和 Vision Bridge。

## 🌟 核心特性

*   **零配置启动**：启动后自动修补 `~/.codex/config.toml`。
*   **Web 控制台**（`http://localhost:8765/dashboard`）：
    *   🌐 中英文切换
    *   🔑 多供应商 API 管理
    *   📝 自定义模型增删
    *   📋 实时日志
*   **多供应商路由**：不同模型走不同 API，格式：`供应商:模型名`。
*   **Computer Use 与 Vision Bridge**：
    *   🖱️ 原生 Win32 API（C# agent，无需 PowerShell）
    *   👁️ `sharp` 图片压缩 + 多模态描述，纯文本模型也能看图操作

## 🚀 快速上手

### 准备工作
- Windows 10+
- Node.js v18+
- .NET 8 SDK (`winget install Microsoft.DotNet.SDK.8`)
- 已安装 Codex Desktop

### 安装与启动

```powershell
git clone https://github.com/AITabby/opencodex-windows.git
cd opencodex-windows
dotnet publish cu-agent/ -c Release
npm install
npm start
```

打开 `http://localhost:8765/dashboard`，填好 API 和模型名即可使用。

> ⚠ Windows 上保存配置后需要**手动重启 Codex Desktop** 才能生效。

## 🔧 Build CU Agent Manually

The C# agent is at `cu-agent/`. It uses raw Win32 API (user32.dll, gdi32.dll) for screen capture, mouse, and keyboard — no PowerShell overhead.

```powershell
dotnet publish cu-agent/ -c Release
```

Output: `cu-agent/bin/Release/net8.0-windows/cu-agent.exe`