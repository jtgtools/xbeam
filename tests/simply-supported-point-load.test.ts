import { describe, it, expect } from 'vitest';
import { analyzeBeam, BeamInput } from '../src/index';

describe('simply-supported-point-load', () => {
	const beam: BeamInput = {
		length: 4,
		modulusOfElasticity: 200e9,
		momentOfInertia: 1e-6, // EI = 200000 N·m²
		supports: [
			{ kind: 'PINNED', position: 0 },
			{ kind: 'ROLLER', position: 4 }
		],
		pointLoads: [{ magnitude: -10000, position: 2 }],
		distributedLoads: [],
		appliedMoments: []
	};

	const results = analyzeBeam(beam);

	it('reactions', () => {
		expect(results.reactions.vertical[0]).toBeCloseTo(5000, 0.1);
		expect(results.reactions.vertical[results.reactions.vertical.length - 1]).toBeCloseTo(5000, 0.1);
	});

	it('max moment', () => {
		const maxMoment = Math.max(...results.moments);
		expect(Math.abs(maxMoment - 10000)).toBeLessThan(1e-5);
	});

	it('max deflection', () => {
		const minDeflection = Math.min(...results.deflections);
		expect(minDeflection).toBeCloseTo(-0.04167, 0.001);
	});

	it('zero deflection at supports', () => {
		expect(results.deflections[0]).toBe(0);
		expect(results.deflections[results.deflections.length - 1]).toBe(0);
	});
});