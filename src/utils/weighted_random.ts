export const weightedRandom = (
  dict: Record<string, number>
): string | undefined => {
  let sum = 0;
  const r = Math.random();
  
  for (const addr of Object.keys(dict)) {
    sum += dict[addr];
    if (r <= sum && dict[addr] > 0) {
      return addr;
    }
  }

  return;
};
