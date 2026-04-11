import type { BeamInput, MeshOptions, Mesh } from './types';
import { DEFAULT_MAX_ELEMENTS, DEFAULT_MIN_ELEMENTS_PER_SEGMENT, TOLERANCE } from './constants';

export function generateMesh(beam: BeamInput, options: MeshOptions = {}): Mesh {
	const eps = options.eps ?? TOLERANCE;
	const maxElements = options.maxElements ?? DEFAULT_MAX_ELEMENTS;
	const minElementsPerSegment = options.minElementsPerSegment ?? DEFAULT_MIN_ELEMENTS_PER_SEGMENT;

	const critical = collectCriticalPoints(beam);
	critical.sort((a, b) => a - b);

	// Unique-ify with eps.
	const unique: number[] = [];
	for (const x of critical) {
		if (unique.length === 0) {
			unique.push(x);
			continue;
		}
		const last = unique[unique.length - 1];
		if (Math.abs(x - last) >= eps) unique.push(x);
	}

	const nodes: number[] = [];
	const L = beam.length;
	if (unique.length < 2) {
		nodes.push(0, L);
		return {
			nodes: new Float64Array(nodes),
			findNodeIndex: (xQuery, epsQuery) => findClosestNodeIndex(nodes, xQuery, epsQuery)
		};
	}

	const targetDensity = maxElements / L;

	for (let i = 0; i < unique.length - 1; i++) {
		const xStart = unique[i];
		const xEnd = unique[i + 1];
		const segLen = xEnd - xStart;
		if (segLen <= eps) continue;

		const nElem = Math.max(Math.floor(segLen * targetDensity), minElementsPerSegment);

		for (let j = 0; j < nElem; j++) {
			const s = j / nElem;
			nodes.push(xStart + s * segLen);
		}
	}

	nodes.push(L);
	const nodeArray = new Float64Array(nodes);

	return {
		nodes: nodeArray,
		findNodeIndex: (xQuery: number, epsQuery: number) => findClosestNodeIndex(nodeArray, xQuery, epsQuery)
	};
}

function collectCriticalPoints(beam: BeamInput): number[] {
	const points: number[] = [0, beam.length];

	for (const s of beam.supports) points.push(s.position);
	for (const pl of beam.pointLoads) points.push(pl.position);
	for (const dl of beam.distributedLoads) {
		points.push(dl.startPosition, dl.endPosition);
	}
	for (const am of beam.appliedMoments ?? []) points.push(am.position);

	return points;
}

function findClosestNodeIndex(nodes: Float64Array | number[], x: number, eps: number): number {
	// Binary search for insertion point.
	let lo = 0;
	let hi = nodes.length - 1;
	while (lo <= hi) {
		const mid = (lo + hi) >>> 1;
		const v = nodes[mid];
		if (x < v - eps) hi = mid - 1;
		else if (x > v + eps) lo = mid + 1;
		else return mid;
	}

	// Check neighbors around lo.
	const candidates: number[] = [];
	if (lo >= 0 && lo < nodes.length) candidates.push(lo);
	if (lo - 1 >= 0 && lo - 1 < nodes.length) candidates.push(lo - 1);

	let bestIdx = -1;
	let bestDist = Number.POSITIVE_INFINITY;
	for (const idx of candidates) {
		const d = Math.abs(nodes[idx] - x);
		if (d <= eps && d < bestDist) {
			bestDist = d;
			bestIdx = idx;
		}
	}
	return bestIdx;
}

