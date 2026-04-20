import { DistributionType } from "../types";
import type { DistributionConfig } from "../types";
import type { PRNG } from "./prng";

export function sample(rng: PRNG, config: DistributionConfig): number {
  const u = rng.next();

  switch (config.type) {
    case DistributionType.Fixed:
      return config.params["value"] ?? 1;
    case DistributionType.Uniform:
      return (
        (config.params["min"] ?? 0) +
        u * ((config.params["max"] ?? 1) - (config.params["min"] ?? 0))
      );
    case DistributionType.Exponential:
      return -Math.log(1 - u) / (config.params["rate"] ?? 1);
    case DistributionType.Normal: {
      const u2 = rng.next();
      const mag = Math.sqrt(-2 * Math.log(u));
      const z = mag * Math.cos(2 * Math.PI * u2);
      return (config.params["mean"] ?? 0) + (config.params["stddev"] ?? 1) * z;
    }
    case DistributionType.LogNormal: {
      const normal = sample(rng, {
        type: DistributionType.Normal,
        params: { mean: config.params["mu"] ?? 0, stddev: config.params["sigma"] ?? 1 },
      });
      return Math.exp(normal);
    }
    case DistributionType.Poisson: {
      const lambda = config.params["rate"] ?? 1;
      const L = Math.exp(-lambda);
      let k = 0;
      let p = 1;
      do {
        k++;
        p *= rng.next();
      } while (p > L);
      return k - 1;
    }
    default:
      return 1;
  }
}

export function exponential(rate: number, rng: PRNG): number {
  return -Math.log(1 - rng.next()) / rate;
}

export function uniform(min: number, max: number, rng: PRNG): number {
  return min + rng.next() * (max - min);
}

export function normal(mean: number, stddev: number, rng: PRNG): number {
  const u1 = rng.next();
  const u2 = rng.next();
  const mag = Math.sqrt(-2 * Math.log(u1));
  const z = mag * Math.cos(2 * Math.PI * u2);
  return mean + stddev * z;
}

export function logNormal(mu: number, sigma: number, rng: PRNG): number {
  return Math.exp(normal(mu, sigma, rng));
}
