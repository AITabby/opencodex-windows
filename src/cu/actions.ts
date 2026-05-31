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

export class ActionPerformer {
  async click(x: number, y: number, button = "left", clicks = 1) {
    for (let i = 0; i < clicks; i++) {
      this.run("click", [String(x), String(y), button === "right" ? "right" : "left"]);
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
    const script = this.getScript(action, args);
    const scriptPath = join(tmpdir(), `oc-act-${Date.now()}.ps1`);
    try {
      writeFileSync(scriptPath, script, "utf-8");
      const r = spawnSync("powershell", ["-NoProfile", "-File", scriptPath], { timeout: 15000, encoding: "utf-8" });
      if (r.status !== 0) {
        throw new Error(`PowerShell execution failed: ${(r.stderr || r.stdout || "Unknown").toString().trim().slice(0, 200)}`);
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
        const [x, y, btn] = a;
        const isRight = btn === "right";
        return [
          "Add-Type -AssemblyName System.Windows.Forms",
          "[System.Windows.Forms.Cursor]::Position = New-Object Drawing.Point($x, $y)",
          `$event = [Windows.Forms.MouseButtons]::${isRight ? "Right" : "Left"}`,
          "[Windows.Forms.Application]::DoEvents()",
          "Start-Sleep -Milliseconds 50",
          `[Windows.Forms.SendKeys]::SendWait(${isRight ? "'+{F10}'" : "' '".replace(/^'(.+)'$/, "'$1'")})`,
          "[Windows.Forms.Application]::DoEvents()"
        ].join("\n");
      }

      case "drag": {
        const [fx, fy, tx, ty] = a;
        return [
          "Add-Type -AssemblyName System.Windows.Forms",
          "Add-Type -AssemblyName System.Drawing",
          `function Drag-Mouse {`,
          `  param([int]$fromX,[int]$fromY,[int]$toX,[int]$toY)`,
          "  [System.Windows.Forms.Cursor]::Position = New-Object Drawing.Point($fromX, $fromY)",
          "  [Windows.Forms.Application]::DoEvents()",
          "  Start-Sleep -Milliseconds 50",
          "  $steps = 20",
          "  for ($i = 1; $i -le $steps; $i++) {",
          "    $t = $i / $steps",
          "    $px = $fromX + ($toX - $fromX) * $t",
          "    $py = $fromY + ($toY - $fromY) * $t",
          "    [System.Windows.Forms.Cursor]::Position = New-Object Drawing.Point([int]$px, [int]$py)",
          "    [Windows.Forms.Application]::DoEvents()",
          "    Start-Sleep -Milliseconds 10",
          "  }",
          "}",
          `Drag-Mouse -fromX ${fx} -fromY ${fy} -toX ${tx} -toY ${ty}`
        ].join("\n");
      }

      case "scroll": {
        const [x, y, dx, dy] = a;
        return [
          "Add-Type -AssemblyName System.Windows.Forms",
          "[System.Windows.Forms.Cursor]::Position = New-Object Drawing.Point($x, $y)",
          `[System.Windows.Forms.SendKeys]::SendWait('{PGDN}')`,
          "[Windows.Forms.Application]::DoEvents()"
        ].join("\n");
      }

      case "type": {
        const t = esc(a[0]);
        return [
          "Add-Type -AssemblyName System.Windows.Forms",
          `$text = '${t}'`,
          "Start-Sleep -Milliseconds 100",
          "[System.Windows.Forms.SendKeys]::SendWait($text)"
        ].join("\n");
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
        if (mods.includes("cmd") || mods.includes("win")) key = "^{" + key + "}";
        return [
          "Add-Type -AssemblyName System.Windows.Forms",
          `[System.Windows.Forms.SendKeys]::SendWait('${esc(key)}')`
        ].join("\n");
      }

      case "windows": {
        return [
          "Add-Type @'",
          "using System;",
          "using System.Runtime.InteropServices;",
          "using System.Text;",
          "using System.Collections.Generic;",
          "public class WinAPI {",
          "  [DllImport(\"user32.dll\")] static extern IntPtr GetDesktopWindow();",
          "  [DllImport(\"user32.dll\")] static extern IntPtr GetWindow(IntPtr hWnd, int uCmd);",
          "  [DllImport(\"user32.dll\")] static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);",
          "  [DllImport(\"user32.dll\")] static extern int GetWindowTextLength(IntPtr hWnd);",
          "  [DllImport(\"user32.dll\")] static extern bool IsWindowVisible(IntPtr hWnd);",
          "  [DllImport(\"user32.dll\")] static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);",
          "  [DllImport(\"user32.dll\")] static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);",
          "  [DllImport(\"user32.dll\")] static extern bool SetForegroundWindow(IntPtr hWnd);",
          "  [DllImport(\"user32.dll\")] static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);",
          "  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }",
          "  public static string GetWindowsJson() {",
          "    var list = new List<Dictionary<string,object>>();",
          "    var hWnd = GetDesktopWindow();",
          "    hWnd = GetWindow(hWnd, 5);",
          "    while (hWnd != IntPtr.Zero) {",
          "      if (IsWindowVisible(hWnd)) {",
          "        int len = GetWindowTextLength(hWnd);",
          "        if (len > 0) {",
          "          var sb = new StringBuilder(len + 1);",
          "          GetWindowText(hWnd, sb, len + 1);",
          "          RECT r; GetWindowRect(hWnd, out r);",
          "          uint pid; GetWindowThreadProcessId(hWnd, out pid);",
          "          try {",
          "            var proc = System.Diagnostics.Process.GetProcessById((int)pid);",
          "            list.Add(new Dictionary<string,object>{",
          "              {\"id\", (int)hWnd}, {\"title\", sb.ToString()},",
          "              {\"app\", proc.ProcessName}, {\"x\", r.Left}, {\"y\", r.Top},",
          "              {\"width\", r.Right - r.Left}, {\"height\", r.Bottom - r.Top}",
          "            });",
          "          } catch {}",
          "        }",
          "      }",
          "      hWnd = GetWindow(hWnd, 2);",
          "    }",
          "    return Newtonsoft.Json.JsonConvert.SerializeObject(list);",
          "  }",
          "  public static void FocusWindow(IntPtr hWnd) {",
          "    ShowWindowAsync(hWnd, 9);",
          "    SetForegroundWindow(hWnd);",
          "  }",
          "}",
          "'@",
          "Add-Type -AssemblyName System.Windows.Forms",
          "try { Add-Type -AssemblyName System.Web.Extensions; $json = (New-Object Web.Script.Serialization.JavaScriptSerializer).Serialize($list) } catch { $json = '[]' }",
          "$json = [WinAPI]::GetWindowsJson()",
          "Write-Output $json"
        ].join("\n");
      }

      case "focus": {
        const [wid] = a;
        return [
          "Add-Type @'",
          "using System;",
          "using System.Runtime.InteropServices;",
          "public class WinAPI {",
          "  [DllImport(\"user32.dll\")] static extern bool SetForegroundWindow(IntPtr hWnd);",
          "  [DllImport(\"user32.dll\")] static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);",
          "  public static void Focus(IntPtr hWnd) { ShowWindowAsync(hWnd, 9); SetForegroundWindow(hWnd); }",
          "}",
          "'@",
          `[WinAPI]::Focus([IntPtr]${wid})`
        ].join("\n");
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}