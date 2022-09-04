const flags: Partial<Record<string, string>> = {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const requireFn = (require as any).context('./images/flags', false, /[a-z]{2}\.png$/);

for (const flagPath of requireFn.keys() as string[]) {
  flags[flagPath.slice(-6, -4).toUpperCase()] = requireFn(flagPath);
}

export default flags;
