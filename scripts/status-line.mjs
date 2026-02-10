#!/usr/bin/env node
/**
 * Custom HUD - Claude Code Statusline
 * No dependencies, no network calls. Shows: context %, changes, session, agents, model.
 *
 * Data sources:
 * - stdin JSON from Claude Code (context window, model, version, cost)
 * - Transcript JSONL (session start, running agents, todos)
 */

import { existsSync, statSync, openSync, readSync, closeSync, createReadStream } from "node:fs";
import { createInterface } from "node:readline";

// ── Constants ───────────────────────────────────────────────────────────────────
const MAX_TAIL_BYTES = 512 * 1024;
const MAX_AGENT_MAP = 100;
const STALE_AGENT_MS = 30 * 60_000;

// ── ANSI Colors ─────────────────────────────────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
};

// ── Stdin ────────────────────────────────────────────────────────────────────────
async function readStdin() {
  if (process.stdin.isTTY) return null;
  const chunks = [];
  try {
    process.stdin.setEncoding("utf8");
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = chunks.join("");
    return raw.trim() ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getContextPercent(stdin) {
  const pct = stdin.context_window?.used_percentage;
  if (typeof pct === "number" && !Number.isNaN(pct)) {
    return Math.min(100, Math.max(0, Math.round(pct)));
  }
  const size = stdin.context_window?.context_window_size;
  if (!size || size <= 0) return 0;
  const usage = stdin.context_window?.current_usage;
  const total = (usage?.input_tokens ?? 0) + (usage?.cache_creation_input_tokens ?? 0) + (usage?.cache_read_input_tokens ?? 0);
  return Math.min(100, Math.round((total / size) * 100));
}

function getModelId(stdin) {
  const id = stdin.model?.id ?? stdin.model?.display_name ?? "unknown";
  const m = id.match(/(?:claude-)?(opus|sonnet|haiku)-(\d+)-(\d+)/);
  if (m) {
    const name = m[1].charAt(0).toUpperCase() + m[1].slice(1);
    return `${name} ${m[2]}.${m[3]}`;
  }
  return id;
}

// ── Transcript Parser ───────────────────────────────────────────────────────────
function readTailLines(filePath, fileSize, maxBytes) {
  const start = Math.max(0, fileSize - maxBytes);
  const len = fileSize - start;
  const fd = openSync(filePath, "r");
  const buf = Buffer.alloc(len);
  try { readSync(fd, buf, 0, len, start); } finally { closeSync(fd); }
  const lines = buf.toString("utf8").split("\n");
  if (start > 0 && lines.length > 0) lines.shift();
  return lines;
}

function extractText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(b => b.text || "").join("");
  return "";
}

async function parseTranscript(transcriptPath) {
  const result = { sessionStart: null, agents: [], todos: [] };
  if (!transcriptPath || !existsSync(transcriptPath)) return result;

  const agentMap = new Map();
  const bgMap = new Map();
  let latestTodos = [];

  function processLine(line) {
    if (!line.trim()) return;
    let entry;
    try { entry = JSON.parse(line); } catch { return; }
    const ts = entry.timestamp ? new Date(entry.timestamp) : new Date();
    if (!result.sessionStart && entry.timestamp) result.sessionStart = ts;

    const content = entry.message?.content;
    if (!content || !Array.isArray(content)) return;

    for (const block of content) {
      // Track agent launches
      if (block.type === "tool_use" && block.id && (block.name === "Task" || block.name === "proxy_Task")) {
        if (agentMap.size >= MAX_AGENT_MAP) {
          let oldest = null, oldestT = Infinity;
          for (const [id, a] of agentMap) {
            if (a.status === "completed" && a.startTime.getTime() < oldestT) {
              oldestT = a.startTime.getTime(); oldest = id;
            }
          }
          if (oldest) agentMap.delete(oldest);
        }
        agentMap.set(block.id, {
          id: block.id,
          type: block.input?.subagent_type ?? "unknown",
          model: block.input?.model,
          description: block.input?.description ?? "",
          status: "running",
          startTime: ts,
        });
      }

      // Track todos
      if (block.type === "tool_use" && block.input?.todos && Array.isArray(block.input.todos)) {
        latestTodos = block.input.todos.map(t => ({ content: t.content, status: t.status }));
      }

      // Track agent completions
      if (block.type === "tool_result" && block.tool_use_id) {
        const agent = agentMap.get(block.tool_use_id);
        if (agent) {
          const text = extractText(block.content);
          if (text.includes("Async agent launched")) {
            const m = text.match(/agentId:\s*([a-zA-Z0-9]+)/);
            if (m) bgMap.set(m[1], block.tool_use_id);
          } else {
            agent.status = "completed";
            agent.endTime = ts;
          }
        }
        // Background agent completion via TaskOutput
        const text = extractText(block.content);
        const tidM = text.match(/<task_id>([^<]+)<\/task_id>/);
        const stM = text.match(/<status>([^<]+)<\/status>/);
        if (tidM && stM?.[1] === "completed") {
          const origId = bgMap.get(tidM[1]);
          const bg = origId && agentMap.get(origId);
          if (bg?.status === "running") { bg.status = "completed"; bg.endTime = ts; }
        }
      }
    }
  }

  try {
    const stat = statSync(transcriptPath);
    if (stat.size > MAX_TAIL_BYTES) {
      // Read first line for session start
      const fd = openSync(transcriptPath, "r");
      const firstBuf = Buffer.alloc(Math.min(4096, stat.size));
      try { readSync(fd, firstBuf, 0, firstBuf.length, 0); } finally { closeSync(fd); }
      const firstLine = firstBuf.toString("utf8").split("\n")[0];
      try {
        const e = JSON.parse(firstLine);
        if (e.timestamp) result.sessionStart = new Date(e.timestamp);
      } catch { /* */ }
      for (const line of readTailLines(transcriptPath, stat.size, MAX_TAIL_BYTES)) processLine(line);
    } else {
      const rl = createInterface({ input: createReadStream(transcriptPath), crlfDelay: Infinity });
      for await (const line of rl) processLine(line);
    }
  } catch { /* partial results */ }

  // Mark stale agents
  const now = Date.now();
  for (const a of agentMap.values()) {
    if (a.status === "running" && now - a.startTime.getTime() > STALE_AGENT_MS) a.status = "completed";
  }

  const running = [...agentMap.values()].filter(a => a.status === "running");
  const completed = [...agentMap.values()].filter(a => a.status === "completed");
  result.agents = [...running, ...completed.slice(-(10 - running.length))].slice(0, 10);
  result.todos = latestTodos;
  return result;
}

// ── Rendering ───────────────────────────────────────────────────────────────────
function formatDuration(ms) {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

function colorForPercent(pct, warnAt = 70, critAt = 85) {
  if (pct >= critAt) return c.red;
  if (pct >= warnAt) return c.yellow;
  return c.green;
}

function render(transcript, contextPct, modelId, version, cost) {
  const parts = [];

  // Context window
  const ctxColor = colorForPercent(contextPct);
  parts.push(`${c.gray}Ctx:${c.reset} ${ctxColor}${contextPct}%${c.reset}`);

  // Lines changed
  const added = cost?.total_lines_added ?? 0;
  const removed = cost?.total_lines_removed ?? 0;
  if (added || removed) {
    parts.push(`${c.green}+${added}${c.reset}${c.dim}/${c.reset}${c.red}-${removed}${c.reset}`);
  }

  // Session duration
  if (transcript.sessionStart) {
    parts.push(`${c.dim}${formatDuration(Date.now() - transcript.sessionStart.getTime())}${c.reset}`);
  }

  // Running agents
  const running = transcript.agents.filter(a => a.status === "running");
  if (running.length > 0) {
    parts.push(`${c.cyan}${running.length} agent${running.length > 1 ? "s" : ""}${c.reset}`);
  }

  // Todos
  if (transcript.todos.length > 0) {
    const done = transcript.todos.filter(t => t.status === "completed").length;
    const total = transcript.todos.length;
    const todoColor = done === total ? c.green : c.yellow;
    parts.push(`${todoColor}${done}/${total} todos${c.reset}`);
  }

  // Model + version
  parts.push(`${c.dim}${modelId}${c.reset}`);
  if (version) parts.push(`${c.dim}v${version}${c.reset}`);

  const mainLine = parts.join(` ${c.dim}|${c.reset} `);

  // Agent detail lines
  const agentLines = [];
  for (let i = 0; i < running.length && i < 5; i++) {
    const a = running[i];
    const isLast = i === running.length - 1 || i === 4;
    const prefix = isLast ? "└─" : "├─";
    const elapsed = formatDuration(Date.now() - a.startTime.getTime());
    const type = (a.type || "agent").substring(0, 14).padEnd(14);
    const desc = (a.description || "").substring(0, 45);
    const badge = a.model === "opus" ? `${c.magenta}O${c.reset}` : a.model === "haiku" ? `${c.green}h${c.reset}` : `${c.cyan}s${c.reset}`;
    agentLines.push(`${c.dim}${prefix}${c.reset} ${badge} ${c.white}${type}${c.reset} ${c.dim}${elapsed.padStart(5)}${c.reset}   ${c.gray}${desc}${c.reset}`);
  }

  return (agentLines.length > 0 ? mainLine + "\n" + agentLines.join("\n") : mainLine) + "\n";
}

// ── Main ────────────────────────────────────────────────────────────────────────
async function main() {
  const stdin = await readStdin();
  if (!stdin) {
    console.log(`${c.dim}[HUD] waiting for data...${c.reset}`);
    return;
  }

  const contextPct = getContextPercent(stdin);
  const modelId = getModelId(stdin);
  const transcript = await parseTranscript(stdin.transcript_path);

  console.log(render(transcript, contextPct, modelId, stdin.version, stdin.cost));
}

main().catch(err => {
  console.log(`[HUD] error: ${err.message}`);
});
