# OpenCodex for Windows 🚀

[English](#english) | [简体中文](#简体中文)

---

# English

**OpenCodex** is a local gateway that unlocks Codex Desktop for third-party APIs on Windows. Features a web dashboard, multi-provider routing, Computer Use, and Vision Bridge.

## 🌟 Key Features

*   **Zero-Config Setup**: Start the server, it auto-patches `~/.codex/config.toml`.
*   **Web Dashboard** (`http://localhost:8765/dashboard`):
    *   🌐 Bilingual (EN/中文)
    *   🔑 Multi-provider API key management
    *   📝 Add/delete custom models, one-click restart/reset
    *   📋 Live log viewer
*   **Multi-Provider Routing**: Different models can use different API providers. Format: `provider:model`.
*   **Computer Use & Vision Bridge**:
    *   🖱️ PowerShell-based mouse/keyboard/screenshot control
    *   👁️ `sharp` image compression + multimodal description for text-only models

## 🚀 Quick Start

### Prerequisites
- Windows 10+
- Node.js v18+
- Codex Desktop installed

### Install & Run

```powershell
git clone https://github.com/AITabby/opencodex-windows.git
cd opencodex-windows
npm install
npm start
```

The dashboard opens in your browser. Add your API providers and models, click save.

---

# 简体中文

**OpenCodex** Windows 版 — 为 Codex Desktop 解锁第三方 API。支持多供应商路由、Web 控制台、Computer Use 和 Vision Bridge。

## 🌟 核心特性

*   **零配置启动**：启动后自动修补 `~/.codex/config.toml`。
*   **Web 控制台**（`http://localhost:8765/dashboard`）：
    *   🌐 中英文切换
    *   🔑 多供应商 API 管理
    *   📝 自定义模型增删，一键重启/还原
    *   📋 实时日志
*   **多供应商路由**：不同模型走不同 API，格式：`供应商:模型名`。
*   **Computer Use 与 Vision Bridge**：
    *   🖱️ PowerShell 鼠标键盘截图控制
    *   👁️ `sharp` 图片压缩 + 多模态描述，纯文本模型也能看图操作

## 🚀 快速上手

### 准备工作
- Windows 10+
- Node.js v18+
- 已安装 Codex Desktop

### 安装与启动

```powershell
git clone https://github.com/AITabby/opencodex-windows.git
cd opencodex-windows
npm install
npm start
```

启动后浏览器打开控制台，填好 API 和模型名即可使用。