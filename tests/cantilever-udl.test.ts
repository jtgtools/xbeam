import { describe, it, expect } from 'vitest';
import { analyzeBeam, BeamInput } from '../src/index';

describe('cantilever-udl', () => {
	const beam: BeamInput = {
		length: 2,
		modulusOfElasticity: 200e9,
		momentOfInertia: 1e-6, // EI = 200000 N·m²
		supports: [{ kind: 'FIXED', position: 0 }],
		pointLoads: [],
		distributedLoads: [{ startMagnitude: -500, endMagnitude: -500, startPosition: 0, endPosition: 2 }],
		appliedMoments: []
	};

	const results = analyzeBeam(beam);

	it('reactions', () => {
		expect(results.reactions.vertical[0]).toBeCloseTo(1000, 0.1);
		expect(results.reactions.moment[0]).toBeCloseTo(1000, 1);
	});

	it('tip deflection', () => {
		expect(results.deflections[results.deflections.length - 1]).toBeCloseTo(-0.00025, 0.0001);
	});

	it('root moment', () => {
		expect(results.moments[0]).toBeCloseTo(-1000, 1);
	});
});