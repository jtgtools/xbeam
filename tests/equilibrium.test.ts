import { describe, it, expect } from 'vitest';
import { analyzeBeam, BeamInput, BeamResults } from '../src/index';

function checkEquilibrium(beam: BeamInput, results: BeamResults) {
	const totalVerticalReaction = results.reactions.vertical.reduce((a, b) => a + b, 0);
	const totalPointLoad = beam.pointLoads.reduce((a, b) => a + b.magnitude, 0);
	const totalDistributedLoad = beam.distributedLoads.reduce((a, dl) => {
		const len = dl.endPosition - dl.startPosition;
		return a + (dl.startMagnitude + dl.endMagnitude) * 0.5 * len;
	}, 0);
	const totalLoad = totalPointLoad + totalDistributedLoad;
	expect(Math.abs(totalVerticalReaction + totalLoad)).toBeLessThan(1e-4 * Math.max(Math.abs(totalLoad), 1));

	// Moment equilibrium about x=0
	let totalMoment = 0;
	for (let i = 0; i < results.reactions.vertical.length; i++) {
		totalMoment += results.reactions.vertical[i] * results.nodePositions[i];
	}
	for (let i = 0; i < results.reactions.moment.length; i++) {
		totalMoment += results.reactions.moment[i];
	}
	for (const pl of beam.pointLoads) {
		totalMoment += pl.magnitude * pl.position;
	}
	for (const dl of beam.distributedLoads) {
		const len = dl.endPosition - dl.startPosition;
		const centroid = dl.startPosition + len / 2;
		const avgLoad = (dl.startMagnitude + dl.endMagnitude) * 0.5;
		totalMoment += avgLoad * len * centroid;
	}
	for (const am of beam.appliedMoments || []) {
		totalMoment += -am.magnitude;
	}
	expect(Math.abs(totalMoment)).toBeLessThan(1e-4 * Math.max(Math.abs(totalLoad) * beam.length, 1));
}

describe('equilibrium', () => {
	const beams: BeamInput[] = [
		// simply supported UDL
		{
			length: 5,
			modulusOfElasticity: 200e9,
			momentOfInertia: 1e-6,
			supports: [{ kind: 'PINNED', position: 0 }, { kind: 'ROLLER', position: 5 }],
			pointLoads: [],
			distributedLoads: [{ startMagnitude: -1000, endMagnitude: -1000, startPosition: 0, endPosition: 5 }],
			appliedMoments: []
		},
		// cantilever tip load
		{
			length: 3,
			modulusOfElasticity: 200e9,
			momentOfInertia: 1e-6,
			supports: [{ kind: 'FIXED', position: 0 }],
			pointLoads: [{ magnitude: -2000, position: 3 }],
			distributedLoads: [],
			appliedMoments: []
		},
		// propped cantilever UDL
		{
			length: 6,
			modulusOfElasticity: 200e9,
			momentOfInertia: 1e-6,
			supports: [{ kind: 'FIXED', position: 0 }, { kind: 'ROLLER', position: 6 }],
			pointLoads: [],
			distributedLoads: [{ startMagnitude: -2000, endMagnitude: -2000, startPosition: 0, endPosition: 6 }],
			appliedMoments: []
		},
		// fixed fixed UDL
		{
			length: 4,
			modulusOfElasticity: 200e9,
			momentOfInertia: 1e-6,
			supports: [{ kind: 'FIXED', position: 0 }, { kind: 'FIXED', position: 4 }],
			pointLoads: [],
			distributedLoads: [{ startMagnitude: -3000, endMagnitude: -3000, startPosition: 0, endPosition: 4 }],
			appliedMoments: []
		},
		// applied moment
		{
			length: 4,
			modulusOfElasticity: 200e9,
			momentOfInertia: 1e-6,
			supports: [{ kind: 'PINNED', position: 0 }, { kind: 'ROLLER', position: 4 }],
			pointLoads: [],
			distributedLoads: [],
			appliedMoments: [{ magnitude: 5000, position: 2 }]
		},
		// overhanging
		{
			length: 5,
			modulusOfElasticity: 200e9,
			momentOfInertia: 1e-6,
			supports: [{ kind: 'PINNED', position: 1 }, { kind: 'ROLLER', position: 3 }],
			pointLoads: [{ magnitude: -5000, position: 5 }],
			distributedLoads: [],
			appliedMoments: []
		}
	];

	for (const beam of beams) {
		it('equilibrium check', () => {
			const results = analyzeBeam(beam);
			checkEquilibrium(beam, results);
		});
	}
});