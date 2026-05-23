import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const workspacePath = process.env.AUDIT_OVERRIDES_WORKSPACE_PATH ?? "pnpm-workspace.yaml";
const outputPath = process.env.AUDIT_OVERRIDES_REPORT_PATH ?? "audit-overrides-report.md";
const auditMarker = "  # audit";

const workspace = readFileSync(workspacePath, "utf8");
const lines = workspace.split("\n");
const auditMarkerIndex = lines.findIndex((line) => line.trim() === "# audit");

if (auditMarkerIndex === -1) {
  finishReport({
    baseline: null,
    candidates: [],
    errors: [`${auditMarker} が見つかりませんでした。`],
  });
  process.exit(0);
}

const auditBlockEnd = findAuditBlockEnd(lines, auditMarkerIndex + 1);
const candidates = collectAuditOverrides(lines, auditMarkerIndex + 1, auditBlockEnd);

if (candidates.length === 0) {
  finishReport({
    baseline: null,
    candidates: [],
    errors: ["audit override が見つかりませんでした。"],
  });
  process.exit(0);
}

const trackedFiles = new Map(
  findPnpmLockfiles(".")
    .concat(workspacePath)
    .map((path) => [path, readFileSync(path, "utf8")]),
);

const baseline = runAudit();
const baselineFingerprints = new Set(baseline.advisories.flatMap(advisoryFingerprints));

if (baseline.error) {
  finishReport({
    baseline,
    candidates: [],
    errors: [baseline.error],
  });
  process.exit(0);
}

writeFileSync(
  workspacePath,
  removeLines(
    lines,
    candidates.map((candidate) => candidate.lineIndex),
  ),
  "utf8",
);

const install = runCommand("pnpm", ["install", "--lockfile-only", "--ignore-scripts"]);

if (install.status !== 0) {
  restoreFiles(trackedFiles);
  finishReport({
    baseline,
    candidates: candidates.map((candidate) => ({
      ...candidate,
      status: "error",
      reason: "lockfile 更新に失敗しました。",
      details: truncateOutput(install.stderr || install.stdout),
    })),
    errors: [],
  });
  process.exit(0);
}

const auditWithoutOverrides = runAudit();

if (auditWithoutOverrides.error) {
  restoreFiles(trackedFiles);
  finishReport({
    baseline,
    candidates: candidates.map((candidate) => ({
      ...candidate,
      status: "error",
      reason: "audit の実行に失敗しました。",
      details: auditWithoutOverrides.error,
    })),
    errors: [],
  });
  process.exit(0);
}

const changedAdvisories = auditWithoutOverrides.advisories.filter((advisory) =>
  advisoryFingerprints(advisory).some((fingerprint) => !baselineFingerprints.has(fingerprint)),
);
const changedAdvisoriesByPackage = groupAdvisoriesByPackage(changedAdvisories);
const results = candidates.map((candidate) => {
  const advisories = changedAdvisoriesByPackage.get(candidate.packageName) ?? [];

  return {
    ...candidate,
    status: advisories.length === 0 ? "removable" : "review",
    reason:
      advisories.length === 0
        ? "audit overrides を全て外しても、このパッケージの advisory は増えませんでした。"
        : "audit overrides を全て外すと、このパッケージの advisory が増えます。",
    advisories,
  };
});

restoreFiles(trackedFiles);

finishReport({
  baseline,
  candidates: results,
  errors: baseline.error ? [baseline.error] : [],
});

function findAuditBlockEnd(sourceLines, startIndex) {
  for (let index = startIndex; index < sourceLines.length; index += 1) {
    const line = sourceLines[index];

    if (line.length > 0 && !line.startsWith(" ")) {
      return index;
    }
  }

  return sourceLines.length;
}

function collectAuditOverrides(sourceLines, startIndex, endIndex) {
  const overrides = [];

  for (let index = startIndex; index < endIndex; index += 1) {
    const line = sourceLines[index];
    const match = line.match(/^  (?:"([^"]+)"|'([^']+)'|([^:#][^:]*)):\s*(.+)$/);

    if (!match) {
      continue;
    }

    const selector = (match[1] ?? match[2] ?? match[3]).trim();
    const replacement = match[4].trim();

    overrides.push({
      lineIndex: index,
      selector,
      packageName: packageNameFromSelector(selector),
      replacement,
    });
  }

  return overrides;
}

function packageNameFromSelector(selector) {
  if (selector.startsWith("@")) {
    const versionSeparator = selector.lastIndexOf("@");

    return versionSeparator > 0 ? selector.slice(0, versionSeparator) : selector;
  }

  return selector.split("@")[0];
}

function removeLines(sourceLines, lineIndexes) {
  const lineIndexSet = new Set(lineIndexes);

  return sourceLines.filter((_, index) => !lineIndexSet.has(index)).join("\n");
}

function findPnpmLockfiles(directory) {
  const lockfiles = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") {
      continue;
    }

    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      lockfiles.push(...findPnpmLockfiles(path));
      continue;
    }

    if (entry.isFile() && entry.name === "pnpm-lock.yaml") {
      lockfiles.push(relative(".", path));
    }
  }

  return lockfiles;
}

function restoreFiles(files) {
  for (const [path, content] of files) {
    if (existsSync(path)) {
      writeFileSync(path, content, "utf8");
    }
  }
}

function runAudit() {
  const result = runCommand("pnpm", ["audit", "--json"]);

  if (!result.stdout.trim()) {
    return {
      advisories: [],
      error: truncateOutput(result.stderr || "audit output is empty."),
    };
  }

  try {
    const report = JSON.parse(result.stdout);

    return {
      advisories: Object.values(report.advisories ?? {}).map((advisory) => ({
        id: advisory.github_advisory_id ?? String(advisory.id),
        findings: (advisory.findings ?? []).flatMap((finding) =>
          (finding.paths ?? []).map((path) => ({
            path,
            version: finding.version,
          })),
        ),
        moduleName: advisory.module_name,
        severity: advisory.severity,
        title: advisory.title,
        patchedVersions: advisory.patched_versions,
        url: advisory.url,
      })),
      metadata: report.metadata,
      error: null,
    };
  } catch (error) {
    return {
      advisories: [],
      error: `audit JSON の解析に失敗しました: ${error.message}`,
    };
  }
}

function runCommand(command, args) {
  return spawnSync(command, args, {
    encoding: "utf8",
    env: {
      ...process.env,
      CI: "true",
    },
  });
}

function advisoryFingerprints(advisory) {
  if (advisory.findings.length === 0) {
    return [advisory.id];
  }

  return advisory.findings.map(
    (finding) => `${advisory.id}\0${finding.version}\0${finding.path}`,
  );
}

function groupAdvisoriesByPackage(advisories) {
  const grouped = new Map();

  for (const advisory of advisories) {
    const packageAdvisories = grouped.get(advisory.moduleName) ?? [];

    packageAdvisories.push(advisory);
    grouped.set(advisory.moduleName, packageAdvisories);
  }

  return grouped;
}

function finishReport(report) {
  const summary = writeReport(report);

  writeActionOutputs(summary);
}

function writeReport({ baseline, candidates, errors }) {
  const removable = candidates.filter((candidate) => candidate.status === "removable");
  const review = candidates.filter((candidate) => candidate.status === "review");
  const failed = candidates.filter((candidate) => candidate.status === "error");
  const baselineCount = baseline?.advisories?.length ?? 0;
  const generatedAt = new Date().toISOString();
  const sections = [
    "# Audit overrides report",
    "",
    `Generated at: ${generatedAt}`,
    "",
    "| Result | Count |",
    "| --- | ---: |",
    `| 削除候補 | ${removable.length} |`,
    `| 要確認 | ${review.length} |`,
    `| 確認失敗 | ${failed.length} |`,
    `| baseline advisories | ${baselineCount} |`,
    "",
    "このレポートは audit overrides を全て一括で外して判定します。同じパッケージに複数 override がある場合、要確認の行は「このパッケージに対する override が少なくとも何か必要」という意味です。",
    "",
  ];

  if (errors.length > 0) {
    sections.push("## Errors", "", ...errors.map((error) => `- ${escapeMarkdown(error)}`), "");
  }

  sections.push(
    "## 削除候補",
    "",
    removable.length === 0
      ? "削除できそうな audit override は見つかりませんでした。"
      : table(
          ["Override", "Replacement", "Reason"],
          removable.map((candidate) => [
            code(candidate.selector),
            code(candidate.replacement),
            candidate.reason,
          ]),
        ),
    "",
    "## 要確認",
    "",
    review.length === 0
      ? "追加で確認が必要そうな override は見つかりませんでした。"
      : table(
          ["Override", "Replacement", "Changed advisories"],
          review.map((candidate) => [
            code(candidate.selector),
            code(candidate.replacement),
            candidate.advisories
              .map(
                (advisory) =>
                  `${link(advisory.id, advisory.url)} ${advisory.severity} ${advisory.moduleName}`,
              )
              .join("<br>"),
          ]),
        ),
    "",
  );

  if (failed.length > 0) {
    sections.push(
      "## 確認失敗",
      "",
      table(
        ["Override", "Reason", "Details"],
        failed.map((candidate) => [
          code(candidate.selector),
          candidate.reason,
          code(candidate.details),
        ]),
      ),
      "",
    );
  }

  writeFileSync(outputPath, `${sections.join("\n")}\n`, "utf8");

  return {
    baselineCount,
    failedCount: failed.length,
    hasRemovable: removable.length > 0,
    removableCount: removable.length,
    reportPath: outputPath,
    reviewCount: review.length,
  };
}

function writeActionOutputs(summary) {
  if (!process.env.GITHUB_OUTPUT) {
    return;
  }

  appendFileSync(
    process.env.GITHUB_OUTPUT,
    [
      `report-path=${summary.reportPath}`,
      `removable-count=${summary.removableCount}`,
      `review-count=${summary.reviewCount}`,
      `failed-count=${summary.failedCount}`,
      `baseline-count=${summary.baselineCount}`,
      `has-removable=${summary.hasRemovable}`,
      "",
    ].join("\n"),
    "utf8",
  );
}

function table(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeTableCell).join(" | ")} |`),
  ].join("\n");
}

function escapeTableCell(value) {
  return String(value).replaceAll("\n", "<br>").replaceAll("|", "\\|");
}

function escapeMarkdown(value) {
  return String(value).replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function code(value) {
  return `\`${String(value).replaceAll("`", "\\`")}\``;
}

function link(label, url) {
  return url ? `[${label}](${url})` : label;
}

function truncateOutput(output) {
  const text = output.trim();

  return text.length > 500 ? `${text.slice(0, 500)}...` : text;
}
