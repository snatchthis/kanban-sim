import seedrandom from "seedrandom";

export interface PRNG {
  next(): number;
  seed: number;
}

export function createPRNG(seed: number): PRNG {
  const rng = seedrandom(seed.toString());
  return {
    next: () => rng(),
    seed,
  };
}
