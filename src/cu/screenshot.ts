import { spawnSync } from "node:child_process";
import { writeFileSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const screenshotDesktop: any = undefined;

export class ScreenshotTaker {
  async capture(): Promise<Buffer> {
    try {
      return this.psCapture();
    } catch {
      return this.fallbackCapture();
    }
  }

  private psCapture(): Buffer {
    const out = join(tmpdir(), `oc-shot-${Date.now()}.png`);
    const script = [
      "Add-Type -AssemblyName System.Windows.Forms",
      "Add-Type -AssemblyName System.Drawing",
      "$screen = [Windows.Forms.Screen]::PrimaryScreen.Bounds",
      "$bitmap = New-Object Drawing.Bitmap $screen.Width, $screen.Height",
      "$graphics = [Drawing.Graphics]::FromImage($bitmap)",
      "$graphics.CopyFromScreen($screen.Location, [Drawing.Point]::Empty, $screen.Size)",
      `$bitmap.Save('${out}', [Drawing.Imaging.ImageFormat]::Png)`,
      "$graphics.Dispose()",
      "$bitmap.Dispose()"
    ].join("\n");
    writeFileSync(join(tmpdir(), "oc-shot.ps1"), script, "utf-8");
    const r = spawnSync("powershell", ["-NoProfile", "-File", join(tmpdir(), "oc-shot.ps1")], { timeout: 15000 });
    try { unlinkSync(join(tmpdir(), "oc-shot.ps1")); } catch {}
    if (r.status !== 0) throw new Error(r.stderr?.toString() || "PowerShell capture failed");
    return readFileSync(out);
  }

  private async fallbackCapture(): Promise<Buffer> {
    const { screenshot } = await import("screenshot-desktop");
    return screenshot({ format: "png" }) as Promise<Buffer>;
  }
}