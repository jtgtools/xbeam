import { describe, it, expect } from 'vitest';
import { analyzeBeam, BeamInput } from '../src/index';

describe('applied-moment', () => {
	const beam: BeamInput = {
		length: 4,
		modulusOfElasticity: 200e9,
		momentOfInertia: 1e-6, // EI = 200000 N·m²
		supports: [
			{ kind: 'PINNED', position: 0 },
			{ kind: 'ROLLER', position: 4 }
		],
		pointLoads: [],
		distributedLoads: [],
		appliedMoments: [{ magnitude: 5000, position: 2 }]
	};

	const results = analyzeBeam(beam);

	it('reactions', () => {
		expect(results.reactions.vertical[0]).toBeCloseTo(-1250, 0.1);
		expect(results.reactions.vertical[results.reactions.vertical.length - 1]).toBeCloseTo(1250, 0.1);
	});

	it('moment right of applied load', () => {
		// Node at x=2 averages two discontinuous element values (≈ 0).
		// The node immediately to the right carries the sagging (+2500) side.
		const midIdx = Math.floor(results.moments.length / 2);
		expect(Math.abs(results.moments[midIdx + 1] - 2500)).toBeLessThan(50);
	});
});