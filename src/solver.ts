import type { BeamReactions, LinearSystem, BoundaryConditions } from './types';
import { HALF_BANDWIDTH } from './constants';

export interface SolveOutputs {
	displacements: Float64Array; // full global u (size nDof)
	reactions: BeamReactions;
}

const BP1 = HALF_BANDWIDTH + 1;

export function solveLinearSystem(system: LinearSystem, bc: BoundaryConditions): SolveOutputs {
	const nDof = system.forceVector.length;
	const u = new Float64Array(nDof);

	const { freeDofs, restrainedDofs } = bc;
	const n = freeDofs.length;
	if (n === 0) throw new Error('All DOFs restrained; nothing to solve.');

	const globalOf = freeDofs;
	const compactOf = new Int32Array(nDof);
	compactOf.fill(-1);
	for (let ii = 0; ii < n; ii++) compactOf[globalOf[ii]] = ii;

	const Kff = new Float64Array(n * n);
	for (let ii = 0; ii < n; ii++) {
		const gi = globalOf[ii];
		for (let jj = ii; jj < n; jj++) {
			const gj = globalOf[jj];
			const d = gj - gi;
			if (d <= HALF_BANDWIDTH) {
				Kff[ii * n + jj] = system.bandedK[gi * BP1 + d];
				Kff[jj * n + ii] = Kff[ii * n + jj];
			}
		}
	}

	// Reduced RHS
	const ff = new Float64Array(n);
	for (let ii = 0; ii < n; ii++) ff[ii] = system.forceVector[globalOf[ii]];

	// Full Cholesky: Kff = L L^T
	const L = Kff;
	for (let i = 0; i < n; i++) {
		for (let k = 0; k < i; k++) {
			let sum = L[i * n + k];
			for (let j = 0; j < k; j++) sum -= L[i * n + j] * L[k * n + j];
			L[i * n + k] = sum / L[k * n + k];
		}
		let sum = L[i * n + i];
		for (let j = 0; j < i; j++) sum -= L[i * n + j] * L[i * n + j];
		if (sum <= 0) throw new Error(`Matrix not SPD near compact DOF ${i}`);
		L[i * n + i] = Math.sqrt(sum);
	}

	// Forward substitution: L y = ff
	const y = new Float64Array(n);
	y[0] = ff[0] / L[0];
	for (let i = 1; i < n; i++) {
		let sum = ff[i];
		for (let j = 0; j < i; j++) sum -= L[i * n + j] * y[j];
		y[i] = sum / L[i * n + i];
	}

	// Back substitution: L^T uf = y
	const uf = new Float64Array(n);
	uf[n - 1] = y[n - 1] / L[(n - 1) * n + (n - 1)];
	for (let i = n - 2; i >= 0; i--) {
		let sum = y[i];
		for (let j = i + 1; j < n; j++) sum -= L[j * n + i] * uf[j];
		uf[i] = sum / L[i * n + i];
	}

	// Scatter back to full u
	for (let ii = 0; ii < n; ii++) u[globalOf[ii]] = uf[ii];

	// Reactions: r = K u - f (for restrained DOFs)
	const nNodes = system.nodePositions.length;
	const reactionVertical = new Float64Array(nNodes);
	const reactionMoment = new Float64Array(nNodes);

	for (let ri = 0; ri < restrainedDofs.length; ri++) {
		const dof = restrainedDofs[ri];

		let Ku = 0;
		for (let d = 0; d <= HALF_BANDWIDTH; d++) {
			const j = dof + d;
			if (j >= nDof) break;
			Ku += system.bandedK[dof * BP1 + d] * u[j];
		}
		for (let d = 1; d <= HALF_BANDWIDTH; d++) {
			const j = dof - d;
			if (j < 0) break;
			Ku += system.bandedK[j * BP1 + d] * u[j];
		}

		const reaction = Ku - system.forceVector[dof];
		const nodeIdx = dof >> 1;
		if ((dof & 1) === 0) reactionVertical[nodeIdx] = reaction;
		else reactionMoment[nodeIdx] = reaction;
	}

	return { displacements: u, reactions: { vertical: reactionVertical, moment: reactionMoment } };
}

/**
 * Pre-allocated scratch space for repeated solves on the same mesh topology.
 * Create once with `createSolverBuffers(nDof)`, reuse across many solve calls.
 */
export interface SolverBuffers {
	readonly nDof: number;
	compactOf: Int32Array;
	Kff: Float64Array;
	Lband: Float64Array;
	ff: Float64Array;
	y: Float64Array;
	uf: Float64Array;
	u: Float64Array;
}

export function createSolverBuffers(nDof: number): SolverBuffers {
	return {
		nDof,
		compactOf: new Int32Array(nDof),
		Kff:   new Float64Array(nDof * BP1),
		Lband: new Float64Array(nDof * BP1),
		ff:    new Float64Array(nDof),
		y:     new Float64Array(nDof),
		uf:    new Float64Array(nDof),
		u:     new Float64Array(nDof),
	};
}

/**
 * Same as `solveLinearSystem` but uses pre-allocated buffers.
 * All output arrays inside `buffers` are overwritten in place.
 */
export function solveLinearSystemBuffered(
	system: LinearSystem,
	bc: BoundaryConditions,
	buffers: SolverBuffers
): SolveOutputs {
	const nDof = system.forceVector.length;
	if (buffers.nDof !== nDof) throw new Error('Buffer size mismatch');

	const { freeDofs, restrainedDofs } = bc;
	const n = freeDofs.length;
	if (n === 0) throw new Error('All DOFs restrained; nothing to solve.');

	const globalOf = freeDofs;
	const compactOf = buffers.compactOf;
	compactOf.fill(-1);
	for (let ii = 0; ii < n; ii++) compactOf[globalOf[ii]] = ii;

	// Extract reduced Kff
	const Kff = new Float64Array(n * n);
	for (let ii = 0; ii < n; ii++) {
		const gi = globalOf[ii];
		for (let jj = ii; jj < n; jj++) {
			const gj = globalOf[jj];
			const d = gj - gi;
			if (d <= HALF_BANDWIDTH) {
				Kff[ii * n + jj] = system.bandedK[gi * BP1 + d];
				Kff[jj * n + ii] = Kff[ii * n + jj];
			}
		}
	}

	// Reduced RHS
	const ff = buffers.ff;
	for (let ii = 0; ii < n; ii++) ff[ii] = system.forceVector[globalOf[ii]];

	// Full Cholesky: Kff = L L^T
	const L = Kff;
	for (let i = 0; i < n; i++) {
		for (let k = 0; k < i; k++) {
			let sum = L[i * n + k];
			for (let j = 0; j < k; j++) sum -= L[i * n + j] * L[k * n + j];
			L[i * n + k] = sum / L[k * n + k];
		}
		let sum = L[i * n + i];
		for (let j = 0; j < i; j++) sum -= L[i * n + j] * L[i * n + j];
		if (sum <= 0) throw new Error(`Matrix not SPD near compact DOF ${i}`);
		L[i * n + i] = Math.sqrt(sum);
	}

	// Forward substitution: L y = ff
	const y = buffers.y;
	y[0] = ff[0] / L[0];
	for (let i = 1; i < n; i++) {
		let sum = ff[i];
		for (let j = 0; j < i; j++) sum -= L[i * n + j] * y[j];
		y[i] = sum / L[i * n + i];
	}

	// Back substitution: L^T uf = y
	const uf = buffers.uf;
	uf[n - 1] = y[n - 1] / L[(n - 1) * n + (n - 1)];
	for (let i = n - 2; i >= 0; i--) {
		let sum = y[i];
		for (let j = i + 1; j < n; j++) sum -= L[j * n + i] * uf[j];
		uf[i] = sum / L[i * n + i];
	}

	// Scatter into buffers.u so reaction loop uses correct displacements
	const u = buffers.u;
	u.fill(0);
	for (let ii = 0; ii < n; ii++) u[globalOf[ii]] = uf[ii];

	// Reactions: r = K u - f (for restrained DOFs)
	const nNodes = system.nodePositions.length;
	const reactionVertical = new Float64Array(nNodes);
	const reactionMoment = new Float64Array(nNodes);

	for (let ri = 0; ri < restrainedDofs.length; ri++) {
		const dof = restrainedDofs[ri];

		let Ku = 0;
		for (let d = 0; d <= HALF_BANDWIDTH; d++) {
			const j = dof + d;
			if (j >= nDof) break;
			Ku += system.bandedK[dof * BP1 + d] * u[j];
		}
		for (let d = 1; d <= HALF_BANDWIDTH; d++) {
			const j = dof - d;
			if (j < 0) break;
			Ku += system.bandedK[j * BP1 + d] * u[j];
		}

		const reaction = Ku - system.forceVector[dof];
		const nodeIdx = dof >> 1;
		if ((dof & 1) === 0) reactionVertical[nodeIdx] = reaction;
		else reactionMoment[nodeIdx] = reaction;
	}

	// Return snapshot copy — buffers.u is scratch, returning it directly would
	// cause previous results to be mutated on the next buffered solve call.
	return { displacements: u.slice(), reactions: { vertical: reactionVertical, moment: reactionMoment } };
}