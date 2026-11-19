// Starts the Python job worker with the project's virtual environment (worker/.venv).
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const python =
  process.platform === "win32"
    ? resolve(root, "worker/.venv/Scripts/python.exe")
    : resolve(root, "worker/.venv/bin/python");

if (!existsSync(python)) {
  console.error(
    "[worker] No encuentro worker/.venv. Créalo una vez con:\n" +
      "  py -m venv worker/.venv\n" +
      "  worker/.venv/Scripts/python -m pip install -r worker/requirements.txt",
  );
  process.exit(1);
}

const child = spawn(python, ["-u", resolve(root, "worker/main.py")], { cwd: root, stdio: "inherit" });
// On Windows the venv's python.exe is a launcher with its own child: kill the whole tree, or an
// old worker survives a restart and keeps taking jobs with old code.
const stop = () => {
  if (process.platform === "win32" && child.pid) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  else child.kill();
};
process.on("exit", stop);
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", (code) => process.exit(code ?? 0));
