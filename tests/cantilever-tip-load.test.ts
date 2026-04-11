import { describe, it, expect } from 'vitest';
import { analyzeBeam, BeamInput } from '../src/index';

describe('cantilever-tip-load', () => {
	const beam: BeamInput = {
		length: 3,
		modulusOfElasticity: 200e9,
		momentOfInertia: 1e-6, // EI = 200000 N·m²
		supports: [{ kind: 'FIXED', position: 0 }],
		pointLoads: [{ magnitude: -2000, position: 3 }],
		distributedLoads: [],
		appliedMoments: []
	};

	const results = analyzeBeam(beam);

	it('reactions', () => {
		expect(results.reactions.vertical[0]).toBeCloseTo(2000, 0.1);
		expect(results.reactions.moment[0]).toBeCloseTo(6000, 1);
	});

	it('tip deflection', () => {
		expect(results.deflections[results.deflections.length - 1]).toBeCloseTo(-0.036, 0.001);
	});

	it('tip rotation', () => {
		expect(results.rotations[results.rotations.length - 1]).toBeCloseTo(-0.018, 0.001);
	});

	it('zero at fixed', () => {
		expect(results.deflections[0]).toBe(0);
		expect(results.rotations[0]).toBe(0);
	});
});