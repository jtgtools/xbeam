import { describe, it, expect } from 'vitest';
import { analyzeBeam, createSolverBuffers, solveLinearSystemBuffered, assembleSystem, getBoundaryConditions, generateMesh, BeamInput } from '../src/index';

describe('solver-buffers', () => {
	const beam: BeamInput = {
		length: 5,
		modulusOfElasticity: 200e9,
		momentOfInertia: 1e-6,
		supports: [{ kind: 'PINNED', position: 0 }, { kind: 'ROLLER', position: 5 }],
		pointLoads: [],
		distributedLoads: [{ startMagnitude: -1000, endMagnitude: -1000, startPosition: 0, endPosition: 5 }],
		appliedMoments: []
	};

	const mesh = generateMesh(beam);
	const system = assembleSystem(beam, mesh);
	const bc = getBoundaryConditions(beam, mesh);

	it('create buffers', () => {
		const buffers = createSolverBuffers(system.forceVector.length);
		expect(buffers.nDof).toBe(system.forceVector.length);
		expect(buffers.compactOf).toBeInstanceOf(Int32Array);
		expect(buffers.Kff).toBeInstanceOf(Float64Array);
		// etc.
	});

	it('buffered solve matches normal', () => {
		const buffers = createSolverBuffers(system.forceVector.length);
		const normalResult = analyzeBeam(beam);
		const bufferedResult = solveLinearSystemBuffered(system, bc, buffers);

		for (let i = 0; i < normalResult.deflections.length; i++) {
			expect(bufferedResult.displacements[2 * i]).toBeCloseTo(normalResult.deflections[i], 1e-10);
		}
		for (let i = 0; i < normalResult.rotations.length; i++) {
			expect(bufferedResult.displacements[2 * i + 1]).toBeCloseTo(normalResult.rotations[i], 1e-10);
		}
		expect(bufferedResult.reactions.vertical).toEqual(normalResult.reactions.vertical);
		expect(bufferedResult.reactions.moment).toEqual(normalResult.reactions.moment);
	});

	it('buffer reuse', () => {
		const buffers = createSolverBuffers(system.forceVector.length);
		const system2 = { ...system, forceVector: new Float64Array(system.forceVector) };
		system2.forceVector[2] += 10000; // perturb first interior vertical DOF (free)

		const result1 = solveLinearSystemBuffered(system, bc, buffers);
		const result2 = solveLinearSystemBuffered(system2, bc, buffers);

		// Displacements at a free DOF must differ when the load changes
		expect(result1.displacements[2]).not.toBeCloseTo(result2.displacements[2], 5);
	});
});