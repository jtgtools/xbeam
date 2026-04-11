import { describe, it, expect } from 'vitest';
import { analyzeBeam, BeamInput } from '../src/index';

describe('propped-cantilever-udl', () => {
	const beam: BeamInput = {
		length: 6,
		modulusOfElasticity: 200e9,
		momentOfInertia: 1e-6, // EI = 200000 N·m²
		supports: [
			{ kind: 'FIXED', position: 0 },
			{ kind: 'ROLLER', position: 6 }
		],
		pointLoads: [],
		distributedLoads: [{ startMagnitude: -2000, endMagnitude: -2000, startPosition: 0, endPosition: 6 }],
		appliedMoments: []
	};

	const results = analyzeBeam(beam);

	it('reactions', () => {
		expect(results.reactions.vertical[0]).toBeCloseTo(7500, 0.1);
		expect(results.reactions.vertical[results.reactions.vertical.length - 1]).toBeCloseTo(4500, 0.1);
		expect(results.reactions.moment[0]).toBeCloseTo(9000, 1);
	});

	it('root moment', () => {
		expect(Math.abs(results.moments[0] - (-9000))).toBeLessThan(0.2);
	});

	it('moment sign at mid', () => {
		const midIdx = Math.floor(results.moments.length / 2);
		expect(results.moments[midIdx]).toBeGreaterThan(0);
	});
});