import type { BeamDiagrams, BeamInput, BeamResults, DiagramOptions, XYSeries } from './types';
import type { Mesh } from './types';
import { DEFAULT_DIAGRAM_POINTS_PER_ELEMENT, TOLERANCE } from './constants';
import { hermiteD2Into, hermiteShapeInto } from './hermite';
import { distributedIntensityAt } from './utils';

function makeSeries(len: number): XYSeries {
	return { x: new Float64Array(len), y: new Float64Array(len) };
}

function pointLoadsAtNodes(beam: BeamInput, mesh: Mesh, eps: number): Float64Array {
	const nNodes = mesh.nodes.length;
	const out = new Float64Array(nNodes);
	for (const pl of beam.pointLoads) {
		const idx = mesh.findNodeIndex(pl.position, eps);
		if (idx >= 0) out[idx] += pl.magnitude;
	}
	return out;
}

export function sampleDiagrams(
	beam: BeamInput,
	mesh: Mesh,
	results: BeamResults,
	options: DiagramOptions = {}
): BeamDiagrams {
	const nodes = results.nodePositions;
	const nNodes = nodes.length;
	const nElems = nNodes - 1;

	const pointsPerElement = options.pointsPerElement ?? DEFAULT_DIAGRAM_POINTS_PER_ELEMENT;
	const eps = options.eps ?? TOLERANCE;
	const includeOutsideEnds = options.includeOutsideEnds ?? true;

	// Degenerate: a single node.
	if (nElems <= 0) {
		const len = includeOutsideEnds ? 2 : 1;
		const deflection = makeSeries(len);
		const moment = makeSeries(len);
		const shear = makeSeries(len);
		deflection.x[0] = nodes[0];
		deflection.y[0] = results.deflections[0];
		if (includeOutsideEnds) {
			deflection.x[1] = nodes[0];
			deflection.y[1] = results.deflections[0];
			moment.x[1] = nodes[0];
			shear.x[1] = nodes[0];
		}
		moment.x[0] = nodes[0];
		shear.x[0] = nodes[0];
		return { deflection, moment, shear };
	}

	const EI = beam.modulusOfElasticity * beam.momentOfInertia;

	// Concentrated vertical contributions per node.
	const pointAtNode = pointLoadsAtNodes(beam, mesh, eps);
	const concAtNode = new Float64Array(nNodes);
	for (let i = 0; i < nNodes; i++) {
		concAtNode[i] = results.reactions.vertical[i] + pointAtNode[i];
	}

	// prefixConc[i] = sum_{k < i} concAtNode[k]
	const prefixConc = new Float64Array(nNodes + 1);
	prefixConc[0] = 0;
	for (let i = 0; i < nNodes; i++) prefixConc[i + 1] = prefixConc[i] + concAtNode[i];

	// qAtNodes: total distributed intensity at nodes.
	const qAtNodes = new Float64Array(nNodes);
	for (let i = 0; i < nNodes; i++) {
		const x = nodes[i];
		let sum = 0;
		for (const dl of beam.distributedLoads) sum += distributedIntensityAt(x, dl);
		qAtNodes[i] = sum;
	}

	// distPrefix[i] = integral 0..nodes[i] q(x) dx (q linear within elements).
	const distPrefix = new Float64Array(nNodes);
	distPrefix[0] = 0;
	for (let e = 0; e < nElems; e++) {
		const le = nodes[e + 1] - nodes[e];
		distPrefix[e + 1] = distPrefix[e] + (qAtNodes[e] + qAtNodes[e + 1]) * 0.5 * le;
	}

	// Output length:
	// - internal element sampling includes (pointsPerElement+1) points per element
	//   (j=0 gives x=xa, j=pp gives x=xb; internal nodes are duplicated naturally).
	// - optional outside points at x=0- and x=L+.
	const internalLen = nElems * (pointsPerElement + 1);
	const totalLen = internalLen + (includeOutsideEnds ? 2 : 0);

	const deflection = makeSeries(totalLen);
	const moment = makeSeries(totalLen);
	const shear = makeSeries(totalLen);

	let idx = 0;

	// outside-left point (x=0-)
	if (includeOutsideEnds) {
		deflection.x[idx] = nodes[0];
		deflection.y[idx] = results.deflections[0];
		moment.x[idx] = nodes[0];
		moment.y[idx] = 0;
		shear.x[idx] = nodes[0];
		shear.y[idx] = 0;
		idx++;
	}

	const N = new Float64Array(4);
	const d2N = new Float64Array(4);

	for (let e = 0; e < nElems; e++) {
		const xa = nodes[e];
		const xb = nodes[e + 1];
		const le = xb - xa;
		if (le <= eps) continue;

		const wA = results.deflections[e];
		const thA = results.rotations[e];
		const wB = results.deflections[e + 1];
		const thB = results.rotations[e + 1];

		const qA = qAtNodes[e];
		const qB = qAtNodes[e + 1];

		// Shear at the element start (x = xa+) includes concAtNode[e].
		const VStart = prefixConc[e + 1] + distPrefix[e];

		for (let j = 0; j <= pointsPerElement; j++) {
			const s = j / pointsPerElement;
			const x = xa + s * le;

			// Deflection
			hermiteShapeInto(s, le, N);
			const w = N[0] * wA + N[1] * thA + N[2] * wB + N[3] * thB;

			// Moment (from curvature)
			hermiteD2Into(s, le, d2N);
			const kappa = d2N[0] * wA + d2N[1] * thA + d2N[2] * wB + d2N[3] * thB;
			const M = EI * kappa;

			// Shear from equilibrium under linear distributed loading.
			// V(x) = VStart + integral_xa..x q(t) dt
			// with q(s) = qA + (qB-qA)*s and dx = le ds:
			const s2 = s * s;
			const Vdist = le * (qA * s + (qB - qA) * 0.5 * s2);
			const V = VStart + Vdist;

			deflection.x[idx] = x;
			deflection.y[idx] = w;
			moment.x[idx] = x;
			moment.y[idx] = M;
			shear.x[idx] = x;
			shear.y[idx] = V;
			idx++;
		}
	}

	// outside-right point (x=L+)
	if (includeOutsideEnds) {
		const last = nNodes - 1;
		deflection.x[idx] = nodes[last];
		deflection.y[idx] = results.deflections[last];
		moment.x[idx] = nodes[last];
		moment.y[idx] = 0;
		shear.x[idx] = nodes[last];
		shear.y[idx] = 0;
		idx++;
	}

	return { deflection, moment, shear };
}

