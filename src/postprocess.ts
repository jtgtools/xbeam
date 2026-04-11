import type { BeamInput, BeamResults } from './types';
import { TOLERANCE } from './constants';
import type { Mesh } from './types';
import { distributedIntensityAt } from './utils';

export function computeNodalResponses(
	beam: BeamInput,
	mesh: Mesh,
	displacements: Float64Array,
	reactions: { vertical: Float64Array; moment: Float64Array }
): BeamResults {
	const nodes = mesh.nodes;
	const nNodes = nodes.length;
	const nElems = nNodes - 1;

	const w = new Float64Array(nNodes);
	const theta = new Float64Array(nNodes);
	for (let i = 0; i < nNodes; i++) {
		w[i] = displacements[2 * i];
		theta[i] = displacements[2 * i + 1];
	}

	const EI = beam.modulusOfElasticity * beam.momentOfInertia;

	// Nodal moments: average of element-end moments computed from Hermite curvature.
	const momentSum = new Float64Array(nNodes);
	const momentCount = new Uint16Array(nNodes);

	for (let e = 0; e < nElems; e++) {
		const xa = nodes[e];
		const xb = nodes[e + 1];
		const le = xb - xa;
		if (le <= TOLERANCE) continue;

		const wA = w[e];
		const thA = theta[e];
		const wB = w[e + 1];
		const thB = theta[e + 1];

		const invL = 1 / le;
		const invL2 = invL * invL;

		// s=0 and s=1 curvature coefficients (w'' with respect to x):
		// kappa(s) = (d2N(s) / dx^2) · [wA,thA,wB,thB]
		const kappaLeft = (-6 * invL2) * wA + (-4 * invL) * thA + (6 * invL2) * wB + (-2 * invL) * thB;
		const mLeft = EI * kappaLeft;

		const kappaRight = (6 * invL2) * wA + (2 * invL) * thA + (-6 * invL2) * wB + (4 * invL) * thB;
		const mRight = EI * kappaRight;

		momentSum[e] += mLeft;
		momentCount[e] += 1;
		momentSum[e + 1] += mRight;
		momentCount[e + 1] += 1;
	}

	const moments = new Float64Array(nNodes);
	for (let i = 0; i < nNodes; i++) {
		moments[i] = momentCount[i] > 0 ? momentSum[i] / momentCount[i] : 0;
	}

	// Nodal shear with right-side semantics: V(x_i+) = sum_{k<=i} concAtNode[k] + integral_0..x_i q(x) dx
	// concAtNode = vertical reactions + point loads mapped to nodes.
	const concAtNode = new Float64Array(nNodes);
	for (let i = 0; i < nNodes; i++) concAtNode[i] = reactions.vertical[i];

	for (const pl of beam.pointLoads) {
		const idx = mesh.findNodeIndex(pl.position, TOLERANCE);
		if (idx >= 0) concAtNode[idx] += pl.magnitude;
	}

	// Distributed load intensity sum at nodes:
	const qAtNodes = new Float64Array(nNodes);
	for (let i = 0; i < nNodes; i++) {
		const x = nodes[i];
		let sum = 0;
		for (const dl of beam.distributedLoads) sum += distributedIntensityAt(x, dl);
		qAtNodes[i] = sum;
	}

	// distPrefix[i] = integral 0..x_i q(x) dx
	const distPrefix = new Float64Array(nNodes);
	distPrefix[0] = 0;
	for (let e = 0; e < nElems; e++) {
		const le = nodes[e + 1] - nodes[e];
		distPrefix[e + 1] = distPrefix[e] + (qAtNodes[e] + qAtNodes[e + 1]) * 0.5 * le;
	}

	// prefixConc[i] = sum_{k<i} concAtNode[k]
	const prefixConc = new Float64Array(nNodes + 1);
	prefixConc[0] = 0;
	for (let i = 0; i < nNodes; i++) prefixConc[i + 1] = prefixConc[i] + concAtNode[i];

	const shears = new Float64Array(nNodes);
	for (let i = 0; i < nNodes; i++) shears[i] = prefixConc[i + 1] + distPrefix[i];

	return {
		nodePositions: nodes,
		deflections: w,
		rotations: theta,
		moments,
		shears,
		reactions: { vertical: reactions.vertical, moment: reactions.moment }
	};
}

