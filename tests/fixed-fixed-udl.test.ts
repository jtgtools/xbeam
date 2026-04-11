import { describe, it, expect } from 'vitest';
import { analyzeBeam, BeamInput } from '../src/index';

describe('fixed-fixed-udl', () => {
	const beam: BeamInput = {
		length: 4,
		modulusOfElasticity: 200e9,
		momentOfInertia: 1e-6, // EI = 200000 N·m²
		supports: [
			{ kind: 'FIXED', position: 0 },
			{ kind: 'FIXED', position: 4 }
		],
		pointLoads: [],
		distributedLoads: [{ startMagnitude: -3000, endMagnitude: -3000, startPosition: 0, endPosition: 4 }],
		appliedMoments: []
	};

	const results = analyzeBeam(beam);

	it('reactions', () => {
		expect(results.reactions.vertical[0]).toBeCloseTo(6000, 0.1);
		expect(results.reactions.vertical[results.reactions.vertical.length - 1]).toBeCloseTo(6000, 0.1);
		expect(results.reactions.moment[0]).toBeCloseTo(4000, 1);
		expect(results.reactions.moment[results.reactions.moment.length - 1]).toBeCloseTo(-4000, 1);
	});

	it('mid moment', () => {
		const midIdx = Math.floor(results.moments.length / 2);
		expect(Math.abs(results.moments[midIdx] - 2000)).toBeLessThan(0.2);
	});

	it('max deflection', () => {
		const minDeflection = Math.min(...results.deflections);
		expect(minDeflection).toBeCloseTo(-0.01667, 0.001);
	});
});