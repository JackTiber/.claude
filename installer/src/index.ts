import * as p from "@clack/prompts";
import { existsSync, lstatSync, readlinkSync, renameSync, symlinkSync, unlinkSync, rmSync } from "fs";
import { resolve, join, basename, dirname } from "path";
import { homedir } from "os";

// When compiled, the binary lives at <repo>/install, so its dirname is the repo root.
// When running from source, import.meta.dirname is installer/src/, two levels up is repo root.
const SOURCE_DIR = resolve(dirname(process.execPath));
const TARGET_DIR = join(homedir(), ".claude");

interface InstallItem {
  value: string;
  label: string;
  hint: string;
  isDir: boolean;
}

const INSTALL_ITEMS: InstallItem[] = [
  { value: "commands", label: "commands/", hint: "Slash commands (create-commit, create-pull-request, research-workspace)", isDir: true },
  { value: "agents", label: "agents/", hint: "Sub-agent definitions (8 agents)", isDir: true },
  { value: "scripts", label: "scripts/", hint: "Utility scripts (context-monitor, workspace-metadata)", isDir: true },
  { value: "settings.json", label: "settings.json", hint: "Permissions, hooks, env vars, statusline, plugins", isDir: false },
];

function isSymlinkTo(path: string, target: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink() && readlinkSync(path) === target;
  } catch {
    return false;
  }
}

function backupIfExists(path: string): string | null {
  if (!existsSync(path)) return null;
  if (lstatSync(path).isSymbolicLink()) {
    unlinkSync(path);
    return null;
  }
  const bakPath = `${path}.bak`;
  renameSync(path, bakPath);
  return bakPath;
}

function restoreBackup(path: string): boolean {
  const bakPath = `${path}.bak`;
  if (existsSync(bakPath)) {
    if (existsSync(path)) {
      if (lstatSync(path).isSymbolicLink()) {
        unlinkSync(path);
      } else {
        rmSync(path, { recursive: true, force: true });
      }
    }
    renameSync(bakPath, path);
    return true;
  }
  return false;
}

function install(items: string[]): void {
  for (const item of items) {
    const sourcePath = join(SOURCE_DIR, item);
    const targetPath = join(TARGET_DIR, item);

    if (!existsSync(sourcePath)) {
      p.log.warning(`Source not found: ${sourcePath}`);
      continue;
    }

    if (isSymlinkTo(targetPath, sourcePath)) {
      p.log.info(`${item} [SKIP] already linked`);
      continue;
    }

    const backup = backupIfExists(targetPath);
    if (backup) {
      p.log.info(`${item} backed up to ${basename(backup)}`);
    }

    symlinkSync(sourcePath, targetPath);
    p.log.success(`${item} -> ${targetPath}`);
  }
}

function uninstall(items: string[]): void {
  for (const item of items) {
    const targetPath = join(TARGET_DIR, item);

    try {
      if (!lstatSync(targetPath)) {
        p.log.info(`${item} [SKIP] not present`);
        continue;
      }
    } catch {
      p.log.info(`${item} [SKIP] not present`);
      continue;
    }

    if (lstatSync(targetPath).isSymbolicLink()) {
      unlinkSync(targetPath);
      const restored = restoreBackup(targetPath);
      if (restored) {
        p.log.success(`${item} symlink removed, backup restored`);
      } else {
        p.log.success(`${item} symlink removed`);
      }
    } else {
      p.log.warning(`${item} is not a symlink, skipping`);
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const doAll = args.includes("--all");
  const doUninstall = args.includes("--uninstall");

  p.intro("Claude Code Configuration Installer");

  p.log.info(`Source: ${SOURCE_DIR}`);
  p.log.info(`Target: ${TARGET_DIR}`);

  const allValues = INSTALL_ITEMS.map((i) => i.value);

  if (doUninstall) {
    p.log.step("Uninstalling...");
    uninstall(allValues);
    p.outro("Uninstall complete. Backups restored where available.");
    return;
  }

  let selected: string[];

  if (doAll) {
    selected = allValues;
  } else {
    const result = await p.multiselect({
      message: "Select items to install:",
      options: INSTALL_ITEMS.map((item) => ({
        value: item.value,
        label: item.label,
        hint: item.hint,
      })),
      initialValues: allValues,
      required: true,
    });

    if (p.isCancel(result)) {
      p.cancel("Installation cancelled.");
      process.exit(0);
    }

    selected = result as string[];
  }

  p.log.step("Installing...");
  install(selected);

  p.outro("Done! Use settings.local.json for machine-specific overrides.");
}

main().catch((err) => {
  p.log.error(String(err));
  process.exit(1);
});
