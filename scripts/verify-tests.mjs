import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Guards against a silently incomplete test run.
 *
 * This machine intermittently fails to start a vitest worker, which drops a
 * whole test file and still exits 0. That turns coverage loss into a green
 * checkmark, so the exit code alone cannot be trusted. This wrapper fails the
 * run when fewer test files executed than expected.
 *
 * Usage: node scripts/verify-tests.mjs <expectedFileCount> [vitest args...]
 */
const expected = Number(process.argv[2]);
const vitestArgs = process.argv.slice(3);

if (!Number.isInteger(expected) || expected < 1) {
  console.error('verify-tests: expected a positive test file count as the first argument');
  process.exit(1);
}

// Invoke vitest's JS entry with the current node binary rather than going
// through a shell, so there is no PATH lookup and no .cmd shim on Windows.
const vitestEntry = resolve(process.cwd(), 'node_modules/vitest/vitest.mjs');
if (!existsSync(vitestEntry)) {
  console.error(`verify-tests: could not find ${vitestEntry}. Run this from a package directory.`);
  process.exit(1);
}

const child = spawn(process.execPath, [vitestEntry, 'run', ...vitestArgs], {
  stdio: ['ignore', 'pipe', 'inherit'],
});

let output = '';
child.stdout.on('data', (chunk) => {
  const text = chunk.toString();
  output += text;
  process.stdout.write(text);
});

child.on('close', (code) => {
  if (code !== 0) process.exit(code ?? 1);

  // "Test Files  4 passed (4)" / "Test Files  3 passed (3) | 1 failed (1)"
  const summary = [...output.matchAll(/Test Files\s+(.*)/g)].pop()?.[1] ?? '';
  const ran = [...summary.matchAll(/\((\d+)\)/g)].reduce(
    (total, match, index) => (index === 0 ? total + Number(match[1]) : total),
    0
  );

  if (ran < expected) {
    console.error(
      `\n[verify-tests] INVALID RUN: only ${ran} of ${expected} test files executed. ` +
        `A worker failed to start, so coverage was silently lost. Re-run before trusting this result.`
    );
    process.exit(1);
  }

  console.log(`[verify-tests] all ${ran} test files executed.`);
});