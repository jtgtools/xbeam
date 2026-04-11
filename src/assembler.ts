import type { BeamInput, LinearSystem, BoundaryConditions } from './types';
import { HALF_BANDWIDTH, TOLERANCE } from './constants';
import { consistentDistributedLoadGaussInto, stiffnessCoefficients } from './element';
import { distributedIntensityAt } from './utils';

import type { Mesh } from './types';

export function assembleSystem(beam: BeamInput, mesh: Mesh): LinearSystem {
	const nodes = mesh.nodes;
	const nNodes = nodes.length;
	const nDof = 2 * nNodes;
	const bp1 = HALF_BANDWIDTH + 1;

	const bandedK = new Float64Array(nDof * bp1);
	const forceVector = new Float64Array(nDof);

	assembleStiffness(beam, nodes, bandedK, bp1);
	assembleForces(beam, mesh, nodes, forceVector);

	return { bandedK, forceVector, nodePositions: nodes };
}

export function getBoundaryConditions(beam: BeamInput, mesh: Mesh): BoundaryConditions {
	const nodes = mesh.nodes;
	const nNodes = nodes.length;
	const nDof = 2 * nNodes;

	const restrained = new Uint8Array(nDof);

	for (const s of beam.supports) {
		const idx = mesh.findNodeIndex(s.position, TOLERANCE);
		if (idx < 0) continue;
		const wDof = 2 * idx;

		switch (s.kind) {
			case 'PINNED':
			case 'ROLLER':
				restrained[wDof] = 1;
				break;
			case 'FIXED':
				restrained[wDof] = 1;
				restrained[wDof + 1] = 1;
				break;
		}
	}

	let nFree = 0;
	let nRest = 0;
	for (let dof = 0; dof < nDof; dof++) {
		if (restrained[dof]) nRest++;
		else nFree++;
	}

	const freeDofs = new Int32Array(nFree);
	const restrainedDofs = new Int32Array(nRest);
	let fi = 0;
	let ri = 0;

	for (let dof = 0; dof < nDof; dof++) {
		if (restrained[dof]) restrainedDofs[ri++] = dof;
		else freeDofs[fi++] = dof;
	}

	return { freeDofs, restrainedDofs };
}

function assembleStiffness(
	beam: BeamInput,
	nodes: Float64Array,
	bandedK: Float64Array,
	bp1: number
): void {
	const E = beam.modulusOfElasticity;
	const I = beam.momentOfInertia;
	const nNodes = nodes.length;

	for (let e = 0; e < nNodes - 1; e++) {
		const le = nodes[e + 1] - nodes[e];
		if (le <= TOLERANCE) continue;
		const { k11, k12, k22, k24 } = stiffnessCoefficients(le, E, I);

		const a = 2 * e;
		const b = 2 * e + 1;
		const c = 2 * (e + 1);
		const d = 2 * (e + 1) + 1;

		// Scatter upper triangle only (j >= i).
		// Row a
		bandedK[a * bp1 + 0] += k11;
		bandedK[a * bp1 + 1] += k12;
		bandedK[a * bp1 + 2] += -k11;
		bandedK[a * bp1 + 3] += k12;
		// Row b
		bandedK[b * bp1 + 0] += k22;
		bandedK[b * bp1 + 1] += -k12;
		bandedK[b * bp1 + 2] += k24;
		// Row c
		bandedK[c * bp1 + 0] += k11;
		bandedK[c * bp1 + 1] += -k12;
		// Row d
		bandedK[d * bp1 + 0] += k22;
	}
}

function assembleForces(beam: BeamInput, mesh: Mesh, nodes: Float64Array, forceVector: Float64Array): void {
	const nNodes = nodes.length;
	const nDof = 2 * nNodes;
	if (forceVector.length !== nDof) throw new Error('Unexpected forceVector size.');

	// Scratch buffers for distributed load integration.
	const loadScratch = new Float64Array(4);
	const shapeScratch = new Float64Array(4);

	// ── Point loads (map to nodes; consistent nodal force at a node affects w only)
	for (const pl of beam.pointLoads) {
		const idx = mesh.findNodeIndex(pl.position, TOLERANCE);
		if (idx < 0) continue;
		forceVector[2 * idx] += pl.magnitude;
	}

	// ── Distributed loads (Gauss integration over overlap with each element)
	for (const dl of beam.distributedLoads) {
		const xMin = Math.min(dl.startPosition, dl.endPosition);
		const xMax = Math.max(dl.startPosition, dl.endPosition);
		if (xMax - xMin <= TOLERANCE) continue;

		for (let e = 0; e < nNodes - 1; e++) {
			const xa = nodes[e];
			const xb = nodes[e + 1];
			const le = xb - xa;
			if (le <= TOLERANCE) continue;

			const overlapStart = Math.max(xa, xMin);
			const overlapEnd = Math.min(xb, xMax);
			if (overlapEnd <= overlapStart + TOLERANCE) continue;

			const sa = (overlapStart - xa) / le;
			const sb = (overlapEnd - xa) / le;

			const qa = distributedIntensityAt(overlapStart, dl);
			const qb = distributedIntensityAt(overlapEnd, dl);

			loadScratch.fill(0);
			consistentDistributedLoadGaussInto(qa, qb, sa, sb, le, loadScratch, shapeScratch);

			const wA = 2 * e;
			const thA = 2 * e + 1;
			const wB = 2 * (e + 1);
			const thB = 2 * (e + 1) + 1;

			forceVector[wA] += loadScratch[0];
			forceVector[thA] += loadScratch[1];
			forceVector[wB] += loadScratch[2];
			forceVector[thB] += loadScratch[3];
		}
	}

	// ── Applied concentrated moments (map to nodes; affects theta DOF)
	for (const am of beam.appliedMoments ?? []) {
		const idx = mesh.findNodeIndex(am.position, TOLERANCE);
		if (idx < 0) continue;
		forceVector[2 * idx + 1] -= am.magnitude;
	}
}

