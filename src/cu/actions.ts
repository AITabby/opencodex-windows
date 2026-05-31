import { spawn, ChildProcess } from "node:child_process";
import { join } from "node:path";
import { existsSync } from "node:fs";

let agent: ChildProcess | null = null;

function getAgent(): ChildProcess {
  if (agent && !agent.killed) return agent;
  const agentPath = join(__dirname, "..", "..", "cu-agent", "cu-agent.exe");
  const fallback = join(__dirname, "..", "..", "cu-agent", "bin", "Release", "net8.0-windows", "cu-agent.exe");
  const exe = existsSync(agentPath) ? agentPath : (existsSync(fallback) ? fallback : "");
  if (!exe) throw new Error("cu-agent.exe not found. Build it first: dotnet publish cu-agent/");
  agent = spawn(exe, [], { stdio: ["pipe", "pipe", "pipe"] });
  agent.on("exit", () => { agent = null; });
  return agent;
}

async function send(action: string, params: Record<string, any> = {}): Promise<any> {
  return new Promise((ok, fail) => {
    const a = getAgent();
    const cmd = JSON.stringify({ action, ...params }) + "\n";
    let buffer = "";
    const onData = (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split("\n");
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        try {
          const result = JSON.parse(line);
          a.stdout?.removeListener("data", onData);
          ok(result);
        } catch {}
      }
      buffer = lines[lines.length - 1];
    };
    a.stdout?.on("data", onData);
    a.stdin?.write(cmd);
    setTimeout(() => { a.stdout?.removeListener("data", onData); fail(new Error("timeout")); }, 15000);
  });
}

export class ScreenshotTaker {
  async capture(): Promise<Buffer> {
    const result = await send("screenshot");
    if (result.status === "ok" && result.data) {
      return Buffer.from(result.data as string, "base64");
    }
    throw new Error("Screenshot failed");
  }
}

export class ActionPerformer {
  async click(x: number, y: number, button = "left", clicks = 1) {
    for (let i = 0; i < clicks; i++) {
      await send("click", { x, y, button });
    }
  }
  async drag(fromX: number, fromY: number, toX: number, toY: number) {
    await send("drag", { from_x: fromX, from_y: fromY, to_x: toX, to_y: toY });
  }
  async scroll(x: number, y: number, deltaX: number, deltaY: number) {
    await send("scroll", { x, y, delta_x: deltaX, delta_y: deltaY });
  }
  async typeText(text: string) {
    await send("type", { text });
  }
  async pressKey(key: string) {
    await send("press_key", { key });
  }
  async pageScroll(direction: string, pages = 1) {
    const k = direction === "down" ? "page_down" : "page_up";
    for (let i = 0; i < pages; i++) {
      await send("press_key", { key: k });
    }
  }
  async getWindows(): Promise<any[]> {
    const result = await send("get_windows");
    return result.windows || [];
  }
  async focusWindow(windowId: number) {
    await send("focus_window", { window_id: windowId });
  }
}
