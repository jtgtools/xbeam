import { describe, it, expect } from 'vitest';
import { analyzeBeam, BeamInput } from '../src/index';

describe('simply-supported-udl', () => {
	const beam: BeamInput = {
		length: 5,
		modulusOfElasticity: 200e9,
		momentOfInertia: 8.333e-6, // for I = 100 cm^4 = 1e-6 m^4, but adjusted for E=2e11, wait no
		// Wait, analytical: EI = 10 000 N·m², so E=2e11, I=5e-8? Wait, let's calculate properly.
		// The prompt says EI = 10 000 N·m², L=5m, w=-1000 N/m
		// RA=RB=2500 N, Mmax=3125 N·m, δmax=5wL^4/(384EI) = 5*1000*625/(384*10000) = 3125000/3840000 ≈ 0.8138 m? Wait, no.
		// 5wL^4 / 384EI = 5*1000*625 / (384*10000) = 3125000 / 3840000 = 0.8138, but prompt says -40.69 mm = -0.04069 m
		// So EI = 5wL^4 / (384 * δmax) = 5*1000*625 / (384 * 0.04069) ≈ 3125000 / (384*0.04069) ≈ 3125000 / 15.62 ≈ 200000
		// So EI = 200000 N·m²
		// For E=200e9 Pa, I = EI/E = 200000 / 200e9 = 1e-6 m^4
		supports: [
			{ kind: 'PINNED', position: 0 },
			{ kind: 'ROLLER', position: 5 }
		],
		pointLoads: [],
		distributedLoads: [{ startMagnitude: -1000, endMagnitude: -1000, startPosition: 0, endPosition: 5 }],
		appliedMoments: []
	};

	const results = analyzeBeam(beam);

	it('reactions vertical', () => {
		expect(results.reactions.vertical[0]).toBeCloseTo(2500, 0.1);
		expect(results.reactions.vertical[results.reactions.vertical.length - 1]).toBeCloseTo(2500, 0.1);
	});

	it('total load balance', () => {
		const totalReaction = results.reactions.vertical.reduce((a, b) => a + b, 0);
		expect(totalReaction).toBeCloseTo(5000, 0.1);
	});

	it('max moment', () => {
		const maxMoment = Math.max(...results.moments);
		expect(Math.abs(maxMoment - 3125)).toBeLessThan(0.1);
	});

	it('max deflection', () => {
		const minDeflection = Math.min(...results.deflections);
		expect(minDeflection).toBeCloseTo(-0.04069, 0.001);
	});

	it('zero deflection at supports', () => {
		expect(results.deflections[0]).toBe(0);
		expect(results.deflections[results.deflections.length - 1]).toBe(0);
	});
});