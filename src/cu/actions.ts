import { spawnSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface WindowInfo {
  id: number;
  title: string;
  app: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const WIN32 = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;
public class WinAPI {
  [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern int ShowScrollBar(IntPtr hWnd, int wBar, bool bShow);
  [DllImport("user32.dll")] public static extern IntPtr GetDesktopWindow();
  [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr hWnd, int uCmd);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
  public const uint MOUSEEVENTF_LEFTUP = 0x0004;
  public const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
  public const uint MOUSEEVENTF_RIGHTUP = 0x0010;
  public const uint MOUSEEVENTF_WHEEL = 0x0800;
  public const uint MOUSEEVENTF_MOVE = 0x0001;
}
"@
`;

export class ActionPerformer {
  async click(x: number, y: number, button = "left", clicks = 1) {
    const isRight = button === "right";
    const down = isRight ? "MOUSEEVENTF_RIGHTDOWN" : "MOUSEEVENTF_LEFTDOWN";
    const up = isRight ? "MOUSEEVENTF_RIGHTUP" : "MOUSEEVENTF_LEFTUP";
    for (let i = 0; i < clicks; i++) {
      this.run("click", [String(x), String(y), down, up]);
    }
  }

  async drag(fromX: number, fromY: number, toX: number, toY: number) {
    this.run("drag", [String(fromX), String(fromY), String(toX), String(toY)]);
  }

  async scroll(x: number, y: number, deltaX: number, deltaY: number) {
    this.run("scroll", [String(x), String(y), String(deltaX), String(deltaY)]);
  }

  async typeText(text: string) {
    this.run("type", [text]);
  }

  async pressKey(key: string) {
    this.run("key", [key]);
  }

  async pageScroll(direction: string, pages = 1) {
    const k = direction === "down" ? "page_down" : "page_up";
    for (let i = 0; i < pages; i++) {
      this.run("key", [k]);
    }
  }

  async getWindows(): Promise<WindowInfo[]> {
    const out = this.run("windows", []);
    return JSON.parse(out);
  }

  async focusWindow(windowId: number) {
    this.run("focus", [String(windowId)]);
  }

  private run(action: string, args: string[]): string {
    const script = WIN32 + "\n" + this.getScript(action, args);
    const scriptPath = join(tmpdir(), `oc-act-${Date.now()}.ps1`);
    try {
      writeFileSync(scriptPath, script, "utf-8");
      const r = spawnSync("powershell", ["-NoProfile", "-File", scriptPath], { timeout: 15000, encoding: "utf-8" });
      if (r.status !== 0) {
        throw new Error(`PS fail: ${(r.stderr || r.stdout || "").toString().trim().slice(0, 200)}`);
      }
      return r.stdout?.trim() || "";
    } finally {
      try { unlinkSync(scriptPath); } catch {}
    }
  }

  private getScript(action: string, a: string[]): string {
    const esc = (s: string) => s.replace(/'/g, "''");

    switch (action) {
      case "click": {
        const [x, y, down, up] = a;
        return `[WinAPI]::SetCursorPos(${x}, ${y})
Start-Sleep -Milliseconds 50
[WinAPI]::mouse_event([WinAPI]::${down}, 0, 0, 0, 0)
Start-Sleep -Milliseconds 50
[WinAPI]::mouse_event([WinAPI]::${up}, 0, 0, 0, 0)`;
      }

      case "drag": {
        const [fx, fy, tx, ty] = a;
        return `[WinAPI]::SetCursorPos(${fx}, ${fy})
Start-Sleep -Milliseconds 50
[WinAPI]::mouse_event([WinAPI]::MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
$steps = 20
for ($i = 1; $i -le $steps; $i++) {
  $t = $i / $steps
  $px = ${fx} + (${tx} - ${fx}) * $t
  $py = ${fy} + (${ty} - ${fy}) * $t
  [WinAPI]::SetCursorPos([int]$px, [int]$py)
  Start-Sleep -Milliseconds 10
}
Start-Sleep -Milliseconds 50
[WinAPI]::mouse_event([WinAPI]::MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)`;
      }

      case "scroll": {
        const [x, y] = a;
        const dy = parseInt(a[3]) || -3;
        return `[WinAPI]::SetCursorPos(${x}, ${y})
[WinAPI]::mouse_event([WinAPI]::MOUSEEVENTF_WHEEL, 0, 0, ${dy * 120}, 0)`;
      }

      case "type": {
        const t = esc(a[0]);
        return `Add-Type -AssemblyName System.Windows.Forms
Start-Sleep -Milliseconds 100
[System.Windows.Forms.SendKeys]::SendWait('${t}')`;
      }

      case "key": {
        const k = a[0];
        const KEY_MAP: Record<string, string> = {
          return: "{ENTER}", enter: "{ENTER}", tab: "{TAB}", escape: "{ESC}", esc: "{ESC}",
          space: " ", backspace: "{BACKSPACE}", delete: "{DELETE}",
          up: "{UP}", down: "{DOWN}", left: "{LEFT}", right: "{RIGHT}",
          home: "{HOME}", end: "{END}", page_up: "{PGUP}", page_down: "{PGDN}",
          a: "a", b: "b", c: "c", d: "d", e: "e", f: "f", g: "g", h: "h",
          i: "i", j: "j", k: "k", l: "l", m: "m", n: "n", o: "o", p: "p",
          q: "q", r: "r", s: "s", t: "t", u: "u", v: "v", w: "w", x: "x", y: "y", z: "z",
          "0": "0", "1": "1", "2": "2", "3": "3", "4": "4", "5": "5", "6": "6", "7": "7", "8": "8", "9": "9"
        };
        const parts = k.toLowerCase().split("+");
        const lk = parts[parts.length - 1];
        const mods = parts.slice(0, -1);
        let key = KEY_MAP[lk] || lk;
        if (mods.includes("ctrl")) key = "^" + key;
        if (mods.includes("alt")) key = "%" + key;
        if (mods.includes("shift")) key = "+" + key;
        return `Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait('${esc(key)}')`;
      }

      case "windows": {
        return `$list = New-Object System.Collections.ArrayList
$hWnd = [WinAPI]::GetDesktopWindow()
$hWnd = [WinAPI]::GetWindow($hWnd, 5)
while ($hWnd -ne [IntPtr]::Zero) {
  if ([WinAPI]::IsWindowVisible($hWnd)) {
    $len = [WinAPI]::GetWindowTextLength($hWnd)
    if ($len -gt 0) {
      $sb = New-Object System.Text.StringBuilder($len + 1)
      [WinAPI]::GetWindowText($hWnd, $sb, $len + 1)
      $r = New-Object WinAPI+RECT
      [WinAPI]::GetWindowRect($hWnd, [ref]$r)
      $pid = 0
      [WinAPI]::GetWindowThreadProcessId($hWnd, [ref]$pid)
      try {
        $p = Get-Process -Id $pid -ErrorAction Stop
        $list.Add(@{id = [int]$hWnd; title = $sb.ToString(); app = $p.ProcessName; x = $r.Left; y = $r.Top; width = $r.Right - $r.Left; height = $r.Bottom - $r.Top}) | Out-Null
      } catch {}
    }
  }
  $hWnd = [WinAPI]::GetWindow($hWnd, 2)
}
$list | ConvertTo-Json`;
      }

      case "focus": {
        const [wid] = a;
        return `[WinAPI]::ShowWindowAsync([IntPtr]${wid}, 9)
[WinAPI]::SetForegroundWindow([IntPtr]${wid})`;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}