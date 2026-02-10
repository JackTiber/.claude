import * as p from "@clack/prompts";
import {
  existsSync,
  lstatSync,
  readlinkSync,
  renameSync,
  symlinkSync,
  unlinkSync,
  rmSync,
  readFileSync,
  writeFileSync,
} from "fs";
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

type PlanType = "subscription" | "api";

const MODEL_ENV: Record<PlanType, Record<string, string | null>> = {
  subscription: {
    ANTHROPIC_MODEL: null,
    ANTHROPIC_SMALL_FAST_MODEL: null,
    AWS_PROFILE: null,
  },
  api: {
    ANTHROPIC_MODEL: "global.anthropic.claude-opus-4-5-20251101-v1:0",
    ANTHROPIC_SMALL_FAST_MODEL: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
    AWS_PROFILE: "default",
  },
};

const PLAN_TOP_LEVEL: Record<PlanType, Record<string, string | null>> = {
  subscription: {
    awsAuthRefresh: null,
  },
  api: {
    awsAuthRefresh: "aws sso login --profile default",
  },
};

const INSTALL_ITEMS: InstallItem[] = [
  {
    value: "commands",
    label: "commands/",
    hint: "Slash commands (create-commit, create-pull-request, research-workspace)",
    isDir: true,
  },
  {
    value: "agents",
    label: "agents/",
    hint: "Sub-agent definitions (8 agents)",
    isDir: true,
  },
  {
    value: "scripts",
    label: "scripts/",
    hint: "Utility scripts (status-line, workspace-metadata)",
    isDir: true,
  },
  {
    value: "settings.json",
    label: "settings.json",
    hint: "Permissions, hooks, env vars, statusline, plugins",
    isDir: false,
  },
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

function applyPlanToSettings(plan: PlanType): void {
  const settingsPath = join(SOURCE_DIR, "settings.json");
  const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
  const env = settings.env ?? {};

  for (const [key, value] of Object.entries(MODEL_ENV[plan])) {
    if (value === null) {
      delete env[key];
    } else {
      env[key] = value;
    }
  }

  for (const [key, value] of Object.entries(PLAN_TOP_LEVEL[plan])) {
    if (value === null) {
      delete settings[key];
    } else {
      settings[key] = value;
    }
  }

  settings.env = env;
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  p.log.success(
    `Model settings updated for ${plan === "subscription" ? "subscription plan" : "API usage"}`,
  );
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

  if (selected.includes("settings.json")) {
    const plan = doAll
      ? "api"
      : await p.select({
          message: "How are you using Claude Code?",
          options: [
            {
              value: "subscription",
              label: "Subscription (Pro/Max)",
              hint: "Uses built-in model defaults",
            },
            {
              value: "api",
              label: "API (Bedrock/Direct)",
              hint: "Sets explicit model IDs in env",
            },
          ],
        });

    if (p.isCancel(plan)) {
      p.cancel("Installation cancelled.");
      process.exit(0);
    }

    applyPlanToSettings(plan as PlanType);
  }

  p.log.step("Installing...");
  install(selected);

  p.outro("Done! Use settings.local.json for machine-specific overrides.");
}

main().catch((err) => {
  p.log.error(String(err));
  process.exit(1);
});
