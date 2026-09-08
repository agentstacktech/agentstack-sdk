/** Output printer — human | json | quiet */

export type OutputMode = 'human' | 'json' | 'quiet';

export function printResult(
  data: unknown,
  mode: OutputMode,
  opts?: { message?: string },
): void {
  if (mode === 'quiet') return;
  if (mode === 'json') {
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
    return;
  }
  if (opts?.message) process.stdout.write(`${opts.message}\n`);
  if (data !== undefined) {
    if (typeof data === 'string') process.stdout.write(`${data}\n`);
    else process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
  }
}

export function printErr(message: string): void {
  process.stderr.write(`${message}\n`);
}
