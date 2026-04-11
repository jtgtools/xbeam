import { describe, it, expect } from 'vitest';
import { analyzeBeam, BeamInput } from '../src/index';

describe('overhanging-beam', () => {
	const beam: BeamInput = {
		length: 5,
		modulusOfElasticity: 200e9,
		momentOfInertia: 1e-6, // EI = 200000 N·m²
		supports: [
			{ kind: 'PINNED', position: 1 },
			{ kind: 'ROLLER', position: 3 }
		],
		pointLoads: [{ magnitude: -5000, position: 5 }],
		distributedLoads: [],
		appliedMoments: []
	};

	const results = analyzeBeam(beam);

	it('reactions', () => {
		const pinnedIdx = results.nodePositions.findIndex(x => Math.abs(x - 1) < 1e-9);
		const rollerIdx = results.nodePositions.findIndex(x => Math.abs(x - 3) < 1e-9);
		expect(results.reactions.vertical[pinnedIdx]).toBeCloseTo(-5000, 0.1);
		expect(results.reactions.vertical[rollerIdx]).toBeCloseTo(10000, 0.1);
	});

	it('shear continuity', () => {
		// Shear should be continuous except at loads/supports
		const shears = results.shears;
		for (let i = 1; i < shears.length - 1; i++) {
			if (Math.abs(results.nodePositions[i] - 1) > 1e-9 && Math.abs(results.nodePositions[i] - 3) > 1e-9 && Math.abs(results.nodePositions[i] - 5) > 1e-9) {
				expect(Math.abs(shears[i] - shears[i - 1])).toBeLessThan(1e-6);
			}
		}
	});
});