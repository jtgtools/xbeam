# xbeam

A fast Euler-Bernoulli beam finite element solver in TypeScript with chart-ready output.

## Features

- 2-node Hermite beam elements
- distributed loads, point loads, and applied moments
- simply supported, cantilever, fixed, and propped support conditions
- full stiffness assembly with banded storage
- Cholesky solve with buffered reuse for speed
- support reaction and equilibrium checks
- deflection, moment, and shear diagram sampling
- demo page with Chart.js visualization

## Install

```bash
npm install
npm run build
```

## Scripts

- `npm test` — run tests with Vitest
- `npm run demo` — build and serve demo UI on http://localhost:3000
- `npm run bench` — run benchmark suite

## Usage

```ts
import { analyzeBeam, analyzeBeamChartReady } from 'xbeam';

const beam = {
  length: 5,
  modulusOfElasticity: 200e9,
  momentOfInertia: 1e-6,
  supports: [{ kind: 'PINNED', position: 0 }, { kind: 'ROLLER', position: 5 }],
  pointLoads: [],
  distributedLoads: [{ startMagnitude: -1000, endMagnitude: -1000, startPosition: 0, endPosition: 5 }],
  appliedMoments: []
};

const results = analyzeBeam(beam);
// results.deflections, results.rotations, results.reactions...

const { results: chartResults, diagrams } = analyzeBeamChartReady(beam);
// diagrams.deflection, diagrams.moment, diagrams.shear
```

## Project structure

- `src/` — TypeScript source
- `tests/` — unit and regression tests
- `demo/` — pictorial demo page
- `dist/` — generated build output

## TypeScript

This project uses strict TS typings. If the compiler reports `Support kind` type errors in tests, ensure support objects are defined with literal `as const` or typed as `Support`.

## License

MIT
