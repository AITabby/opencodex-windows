import { spawnSync } from "node:child_process";
import { writeFileSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import screenshot from "screenshot-desktop";

export class ScreenshotTaker {
  async capture(): Promise<Buffer> {
    try {
      return await this.fallbackCapture();
    } catch {
      return this.psCapture();
    }
  }

  private psCapture(): Buffer {
    const out = join(tmpdir(), `oc-shot-${Date.now()}.png`);
    const scriptPath = join(tmpdir(), `oc-shot-${Date.now()}.ps1`);
    const script = [
      "Add-Type -AssemblyName System.Windows.Forms",
      "Add-Type -AssemblyName System.Drawing",
      "$screen = [Windows.Forms.Screen]::PrimaryScreen.Bounds",
      "$bitmap = New-Object Drawing.Bitmap $screen.Width, $screen.Height",
      "$graphics = [Drawing.Graphics]::FromImage($bitmap)",
      "$graphics.CopyFromScreen($screen.Location, [Drawing.Point]::Empty, $screen.Size)",
      `$bitmap.Save('${out.replace(/\\/g, "/")}', [Drawing.Imaging.ImageFormat]::Png)`,
      "$graphics.Dispose()",
      "$bitmap.Dispose()"
    ].join("\n");
    writeFileSync(scriptPath, script, "utf-8");
    try {
      const r = spawnSync("powershell", ["-NoProfile", "-File", scriptPath], { timeout: 15000 });
      if (r.status !== 0) throw new Error("PowerShell capture failed");
      return readFileSync(out);
    } finally {
      try { unlinkSync(scriptPath); } catch {}
      try { unlinkSync(out); } catch {}
    }
  }

  private async fallbackCapture(): Promise<Buffer> {
    return screenshot({ format: "png" }) as Promise<Buffer>;
  }
}