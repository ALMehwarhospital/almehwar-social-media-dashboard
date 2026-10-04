import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve("public/data");
const publishedBase = String(process.env.PUBLISHED_DATA_BASE || "").replace(/\/$/, "");

function readJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
  catch { return null; }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

async function publishedJson(fileName) {
  if (!publishedBase) return null;
  try {
    const response = await fetch(`${publishedBase}/${fileName}?t=${Date.now()}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function validMonth(value) {
  return /^\d{4}-\d{2}$/.test(String(value || ""));
}

async function hydrateArchives(kind) {
  const indexName = `${kind}-history-index.json`;
  const localIndex = readJson(path.join(dataDir, indexName));
  const remoteIndex = await publishedJson(indexName);
  const months = new Set([
    ...(Array.isArray(localIndex?.months) ? localIndex.months : []),
    ...(Array.isArray(remoteIndex?.months) ? remoteIndex.months : []),
  ].filter(validMonth));

  for (const month of months) {
    const archiveName = `${kind}-history-${month}.json`;
    const localPath = path.join(dataDir, archiveName);
    if (fs.existsSync(localPath)) continue;
    const remoteArchive = await publishedJson(archiveName);
    if (remoteArchive) writeJson(localPath, remoteArchive);
  }
  return months;
}

function buildSocialArchive(snapshot, month) {
  const content = Array.isArray(snapshot?.data?.content)
    ? snapshot.data.content.filter((row) => row?.month === month)
    : [];
  const video = Array.isArray(snapshot?.data?.video)
    ? snapshot.data.video.filter((row) => row?.month === month)
    : [];
  return {
    source: "Automatic month rollover snapshot",
    generatedAt: new Date().toISOString(),
    month,
    content,
    video,
    counts: { content: content.length, video: video.length },
  };
}

async function preserveKind(kind) {
  const months = await hydrateArchives(kind);
  const liveName = kind === "website" ? "website-live.json" : "social-dashboard-live.json";
  const current = readJson(path.join(dataDir, liveName));
  const published = await publishedJson(liveName);
  const monthKey = kind === "website" ? "periodMonth" : "currentMonth";
  const oldMonth = published?.[monthKey];
  const newMonth = current?.[monthKey];

  if (validMonth(oldMonth) && validMonth(newMonth) && oldMonth !== newMonth) {
    const archiveName = `${kind}-history-${oldMonth}.json`;
    const archivePath = path.join(dataDir, archiveName);
    if (!fs.existsSync(archivePath)) {
      const archive = kind === "website" ? published : buildSocialArchive(published, oldMonth);
      writeJson(archivePath, archive);
      console.log(`Archived ${kind} month ${oldMonth}.`);
    }
    months.add(oldMonth);
  }

  writeJson(path.join(dataDir, `${kind}-history-index.json`), {
    months: [...months].sort(),
  });
}

await preserveKind("website");
await preserveKind("social");
