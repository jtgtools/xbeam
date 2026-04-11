import { describe, it, expect } from 'vitest';
import { analyzeBeamChartReady, BeamInput } from '../src/index';

describe('diagram-series', () => {
	const beam: BeamInput = {
		length: 5,
		modulusOfElasticity: 200e9,
		momentOfInertia: 1e-6,
		supports: [{ kind: 'PINNED', position: 0 }, { kind: 'ROLLER', position: 5 }],
		pointLoads: [],
		distributedLoads: [{ startMagnitude: -1000, endMagnitude: -1000, startPosition: 0, endPosition: 5 }],
		appliedMoments: []
	};

	const { results, diagrams } = analyzeBeamChartReady(beam);

	it('series lengths', () => {
		expect(diagrams.deflection.x.length).toBe(diagrams.deflection.y.length);
		expect(diagrams.moment.x.length).toBe(diagrams.moment.y.length);
		expect(diagrams.shear.x.length).toBe(diagrams.shear.y.length);
	});

	it('x monotonic', () => {
		for (let i = 1; i < diagrams.deflection.x.length; i++) {
			expect(diagrams.deflection.x[i]).toBeGreaterThanOrEqual(diagrams.deflection.x[i - 1]);
		}
	});

	it('x in range', () => {
		for (const x of diagrams.deflection.x) {
			expect(x).toBeGreaterThanOrEqual(0);
			expect(x).toBeLessThanOrEqual(5);
		}
	});

	it('moment endpoints', () => {
		expect(diagrams.moment.y[0]).toBeCloseTo(0, 1e-6);
		expect(diagrams.moment.y[diagrams.moment.y.length - 1]).toBeCloseTo(0, 1e-6);
	});

	it('max moment', () => {
		const maxMoment = Math.max(...diagrams.moment.y);
		expect(Math.abs(maxMoment - 3125)).toBeLessThan(0.1);
	});
});