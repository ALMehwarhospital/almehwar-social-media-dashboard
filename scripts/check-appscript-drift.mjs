import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const previousCommit = process.argv[2];
const remoteDirectory = process.argv[3];
const initialSnapshot = process.argv[4];

if (!/^[a-f0-9]{40}$/.test(previousCommit || '') || !remoteDirectory) {
  throw new Error('Expected previous commit SHA and downloaded Apps Script directory.');
}

const sourceDirectory = 'appscript/current';
// Compare the live project with the complete imported source history.
const remoteFiles = readdirSync(remoteDirectory).filter((name) => name.endsWith('.js') || name === 'appsscript.json');
const remoteName = (name) => {
  if (name === 'appsscript.json') return name;
  const candidates = [`${name.slice(0, -3)}.js`, `${name}.js`];
  return candidates.find((candidate) => existsSync(join(remoteDirectory, candidate))) || candidates[0];
};
const normalized = (bytes) => bytes.toString('utf8').replace(/\r\n/g, '\n').trimEnd();

const filesAt = (commit) => execFileSync('git', ['ls-tree', '--name-only', '-r', commit, sourceDirectory], { encoding: 'utf8' })
  .trim().split('\n').map(path => path.split('/').pop())
  .filter(name => name && (name.endsWith('.gs') || name === 'appsscript.json')).sort();

// New files in this GitHub commit are expected to be absent from the live
// project. Compare the live project with the prior revision before pushing.
const differencesFor = (commit) => {
  const priorFiles = filesAt(commit);
  if (priorFiles.map(remoteName).sort().join('\n') !== remoteFiles.slice().sort().join('\n'))
    return ['file list'];
  return priorFiles.filter((name) => {
    const prior = execFileSync('git', ['show', `${commit}:${sourceDirectory}/${name}`]);
    const remote = readFileSync(join(remoteDirectory, remoteName(name)));
    return name === 'appsscript.json'
      ? JSON.stringify(JSON.parse(prior.toString('utf8'))) !== JSON.stringify(JSON.parse(remote.toString('utf8')))
      : normalized(prior) !== normalized(remote);
  });
};

let differences = differencesFor(previousCommit);
let matchedCommit = previousCommit;

// Before the first successful sync, test commits may have changed GitHub only.
// Accept the owner-supplied snapshot only if the live source still matches it.
if (differences.length && /^[a-f0-9]{40}$/.test(initialSnapshot || '')) {
  const initialDifferences = differencesFor(initialSnapshot);
  if (!initialDifferences.length) {
    differences = [];
    matchedCommit = initialSnapshot;
  }
}

if (differences.length) {
  throw new Error(`Apps Script differs from the previous GitHub revision: ${differences.join(', ')}. Review/pull live changes before pushing.`);
}

console.log(`Live Apps Script matches GitHub revision ${matchedCommit.slice(0, 12)} (${filesAt(matchedCommit).length} files).`);
