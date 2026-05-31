using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;

class WinAPI {
  [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
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
  [DllImport("gdi32.dll")] public static extern bool BitBlt(IntPtr hdc, int nXDest, int nYDest, int nWidth, int nHeight, IntPtr hdcSrc, int nXSrc, int nYSrc, uint dwRop);
  [DllImport("gdi32.dll")] public static extern IntPtr CreateDC(string lpszDriver, string lpszDevice, string lpszOutput, IntPtr lpInitData);
  [DllImport("gdi32.dll")] public static extern IntPtr CreateCompatibleDC(IntPtr hdc);
  [DllImport("gdi32.dll")] public static extern IntPtr CreateCompatibleBitmap(IntPtr hdc, int nWidth, int nHeight);
  [DllImport("gdi32.dll")] public static extern IntPtr SelectObject(IntPtr hdc, IntPtr hgdiobj);
  [DllImport("gdi32.dll")] public static extern bool DeleteDC(IntPtr hdc);
  [DllImport("gdi32.dll")] public static extern bool DeleteObject(IntPtr hObject);

  public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
  public const uint MOUSEEVENTF_LEFTUP = 0x0004;
  public const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
  public const uint MOUSEEVENTF_RIGHTUP = 0x0010;
  public const uint MOUSEEVENTF_MIDDLEDOWN = 0x0020;
  public const uint MOUSEEVENTF_MIDDLEUP = 0x0040;
  public const uint MOUSEEVENTF_WHEEL = 0x0800;
  public const uint SRCCOPY = 0x00CC0020;
  public const int SW_RESTORE = 9;

  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}

[DllImport("user32.dll")] static extern int GetSystemMetrics(int nIndex);

byte[] Screenshot() {
  IntPtr hdcScreen = WinAPI.CreateDC("DISPLAY", null, null, IntPtr.Zero);
  IntPtr hdc = WinAPI.CreateCompatibleDC(hdcScreen);
  int w = GetSystemMetrics(0), h = GetSystemMetrics(1);
  IntPtr hBitmap = WinAPI.CreateCompatibleBitmap(hdcScreen, w, h);
  WinAPI.SelectObject(hdc, hBitmap);
  WinAPI.BitBlt(hdc, 0, 0, w, h, hdcScreen, 0, 0, WinAPI.SRCCOPY);
  using Bitmap bmp = Image.FromHbitmap(hBitmap);
  using MemoryStream ms = new MemoryStream();
  bmp.Save(ms, ImageFormat.Png);
  WinAPI.DeleteObject(hBitmap);
  WinAPI.DeleteDC(hdc);
  WinAPI.DeleteDC(hdcScreen);
  return ms.ToArray();
}

string? line;
while ((line = Console.ReadLine()) != null) {
  try {
    var cmd = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(line);
    if (cmd == null) continue;
    string action = cmd["action"].GetString() ?? "";
    var result = new Dictionary<string, object> { ["status"] = "ok" };

    switch (action) {
      case "screenshot": {
        result["data"] = Convert.ToBase64String(Screenshot());
        break;
      }
      case "click": {
        int x = cmd["x"].GetInt32();
        int y = cmd["y"].GetInt32();
        string btn = cmd.ContainsKey("button") ? cmd["button"].GetString() ?? "left" : "left";
        WinAPI.SetCursorPos(x, y);
        Thread.Sleep(30);
        if (btn == "right") {
          WinAPI.mouse_event(WinAPI.MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0);
          Thread.Sleep(30);
          WinAPI.mouse_event(WinAPI.MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0);
        } else {
          WinAPI.mouse_event(WinAPI.MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
          Thread.Sleep(30);
          WinAPI.mouse_event(WinAPI.MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
        }
        break;
      }
      case "drag": {
        int fx = cmd["from_x"].GetInt32(), fy = cmd["from_y"].GetInt32();
        int tx = cmd["to_x"].GetInt32(), ty = cmd["to_y"].GetInt32();
        WinAPI.SetCursorPos(fx, fy);
        Thread.Sleep(30);
        WinAPI.mouse_event(WinAPI.MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        for (int i = 1; i <= 20; i++) {
          double t = (double)i / 20;
          WinAPI.SetCursorPos((int)(fx + (tx - fx) * t), (int)(fy + (ty - fy) * t));
          Thread.Sleep(8);
        }
        Thread.Sleep(30);
        WinAPI.mouse_event(WinAPI.MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
        break;
      }
      case "scroll": {
        int x = cmd["x"].GetInt32(), y = cmd["y"].GetInt32();
        int dy = cmd.ContainsKey("delta_y") ? cmd["delta_y"].GetInt32() : -3;
        WinAPI.SetCursorPos(x, y);
        WinAPI.mouse_event(WinAPI.MOUSEEVENTF_WHEEL, 0, 0, (uint)(dy * 120), 0);
        break;
      }
      case "type": {
        string text = cmd["text"].GetString() ?? "";
        System.Windows.Forms.SendKeys.SendWait(text);
        break;
      }
      case "press_key": {
        string key = cmd["key"].GetString() ?? "";
        var parts = key.ToLower().Split('+');
        string k = parts.Length > 0 ? (parts[^1] is string last ? last : k = "") : "";
        var keyMap = new Dictionary<string, string> {
          ["return"]="{ENTER}",["enter"]="{ENTER}",["tab"]="{TAB}",["escape"]="{ESC}",["esc"]="{ESC}",
          ["space"]=" ",["backspace"]="{BACKSPACE}",["delete"]="{DELETE}",
          ["up"]="{UP}",["down"]="{DOWN}",["left"]="{LEFT}",["right"]="{RIGHT}",
          ["home"]="{HOME}",["end"]="{END}",["page_up"]="{PGUP}",["page_down"]="{PGDN}"
        };
        string rk = keyMap.GetValueOrDefault(k, k);
        for (int i = 0; i < parts.Length - 1; i++) {
          if (parts[i] == "ctrl") rk = "^" + rk;
          else if (parts[i] == "alt") rk = "%" + rk;
          else if (parts[i] == "shift") rk = "+" + rk;
        }
        System.Windows.Forms.SendKeys.SendWait(rk);
        break;
      }
      case "get_windows": {
        var windows = new List<Dictionary<string, object>>();
        IntPtr hWnd = WinAPI.GetWindow(WinAPI.GetDesktopWindow(), 5);
        while (hWnd != IntPtr.Zero) {
          if (WinAPI.IsWindowVisible(hWnd)) {
            int len = WinAPI.GetWindowTextLength(hWnd);
            if (len > 0) {
              var sb = new StringBuilder(len + 1);
              WinAPI.GetWindowText(hWnd, sb, len + 1);
              WinAPI.GetWindowRect(hWnd, out WinAPI.RECT r);
              WinAPI.GetWindowThreadProcessId(hWnd, out uint pid);
              try {
                var proc = System.Diagnostics.Process.GetProcessById((int)pid);
                windows.Add(new Dictionary<string, object> {
                  ["id"] = (int)hWnd, ["title"] = sb.ToString(),
                  ["app"] = proc.ProcessName, ["x"] = r.Left, ["y"] = r.Top,
                  ["width"] = r.Right - r.Left, ["height"] = r.Bottom - r.Top
                });
              } catch {}
            }
          }
          hWnd = WinAPI.GetWindow(hWnd, 2);
        }
        result["windows"] = windows;
        break;
      }
      case "focus_window": {
        int wid = cmd["window_id"].GetInt32();
        WinAPI.ShowWindowAsync((IntPtr)wid, WinAPI.SW_RESTORE);
        WinAPI.SetForegroundWindow((IntPtr)wid);
        break;
      }
      default:
        result["status"] = "error";
        result["error"] = $"Unknown action: {action}";
        break;
    }
    Console.WriteLine(JsonSerializer.Serialize(result));
  } catch (Exception ex) {
    Console.Error.WriteLine($"CU-Agent error: {ex.Message}");
    Console.WriteLine(JsonSerializer.Serialize(new Dictionary<string, object> {
      ["status"] = "error", ["error"] = ex.Message
    }));
  }
}
