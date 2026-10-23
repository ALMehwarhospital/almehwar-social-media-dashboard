import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const previousCommit = process.argv[2];
const remoteDirectory = process.argv[3];

if (!/^[a-f0-9]{40}$/.test(previousCommit || '') || !remoteDirectory) {
  throw new Error('Expected previous commit SHA and downloaded Apps Script directory.');
}

const sourceDirectory = 'appscript/current';
const files = readdirSync(sourceDirectory).filter((name) => name.endsWith('.gs') || name === 'appsscript.json');
const remoteFiles = readdirSync(remoteDirectory).filter((name) => name.endsWith('.gs') || name === 'appsscript.json');
const normalized = (bytes) => bytes.toString('utf8').replace(/\r\n/g, '\n').trimEnd();

if (files.join('\n') !== remoteFiles.join('\n')) {
  throw new Error(`Apps Script file list has changed outside GitHub. Remote: ${remoteFiles.join(', ')}`);
}

const differences = files.filter((name) => {
  const prior = execFileSync('git', ['show', `${previousCommit}:${sourceDirectory}/${name}`]);
  const remote = readFileSync(join(remoteDirectory, name));
  if (name === 'appsscript.json') {
    return JSON.stringify(JSON.parse(prior.toString('utf8'))) !== JSON.stringify(JSON.parse(remote.toString('utf8')));
  }
  return normalized(prior) !== normalized(remote);
});

if (differences.length) {
  throw new Error(`Apps Script differs from the previous GitHub revision: ${differences.join(', ')}. Review/pull live changes before pushing.`);
}

console.log(`Live Apps Script matches the previous GitHub revision (${files.length} files).`);
