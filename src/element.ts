import { hermiteShapeInto } from './hermite';

const GAUSS_POINTS = [-Math.sqrt(3 / 5), 0, Math.sqrt(3 / 5)] as const;
const GAUSS_WEIGHTS = [5 / 9, 8 / 9, 5 / 9] as const;

export interface StiffnessCoefficients {
	k11: number;
	k12: number;
	k22: number;
	k24: number;
}

export function stiffnessCoefficients(le: number, E: number, I: number): StiffnessCoefficients {
	const EI = E * I;
	const le2 = le * le;
	const le3 = le2 * le;

	return {
		k11: (12 * EI) / le3,
		k12: (6 * EI) / le2,
		k22: (4 * EI) / le,
		k24: (2 * EI) / le
	};
}

/**
 * Consistent nodal forces for a linearly-varying distributed load over the
 * overlap sub-interval [sa, sb] in local coordinates.
 *
 * q is linearly varying between qa at sa and qb at sb.
 *
 * DOF order: [wA, thetaA, wB, thetaB].
 *
 * Caller must zero `out` before calling.
 */
export function consistentDistributedLoadGaussInto(
	qa: number,
	qb: number,
	sa: number,
	sb: number,
	le: number,
	out: Float64Array,
	shapeScratch: Float64Array
): void {
	const mid = (sa + sb) / 2;
	const hw = (sb - sa) / 2;
	const dq = sb > sa ? (qb - qa) / (sb - sa) : 0;

	for (let g = 0; g < 3; g++) {
		const s = mid + hw * GAUSS_POINTS[g];
		const q = qa + dq * (s - sa);

		// N(s) for Hermite bending interpolation.
		hermiteShapeInto(s, le, shapeScratch);

		// Physical measure:
		// x = xa + s*le, dx = le ds
		// The mapping from [-1,1] to [sa,sb] gives ds = hw * dξ.
		const w = GAUSS_WEIGHTS[g] * hw * le * q;

		out[0] += w * shapeScratch[0];
		out[1] += w * shapeScratch[1];
		out[2] += w * shapeScratch[2];
		out[3] += w * shapeScratch[3];
	}
}

// Intentionally not exporting more helpers than needed.
