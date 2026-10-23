import { spawn } from "node:child_process";

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Runs a binary and collects its output. Never throws on non-zero exit; callers decide. */
export function run(cmd: string, args: string[], opts: { timeoutMs?: number; maxBuffer?: number } = {}): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    const limit = opts.maxBuffer ?? 20 * 1024 * 1024;
    child.stdout.on("data", (d) => {
      if (stdout.length < limit) stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      if (stderr.length < limit) stderr += d.toString();
    });
    const timer = opts.timeoutMs
      ? setTimeout(() => {
          child.kill();
          reject(new Error(`${cmd} timed out after ${opts.timeoutMs}ms`));
        }, opts.timeoutMs)
      : null;
    child.on("error", (err) => {
      if (timer) clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}
