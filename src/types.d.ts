declare module "screenshot-desktop" {
  export default function screenshot(options?: { format?: string }): Promise<Buffer>;
  export function screenshot(options?: { format?: string }): Promise<Buffer>;
  export function listDisplays(): Promise<any[]>;
}
