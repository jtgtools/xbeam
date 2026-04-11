/**
 * Hermite cubic shape functions for an Euler-Bernoulli beam element.
 *
 * Local coordinate `s` is in [0, 1].
 * DOF order: [wA, thetaA, wB, thetaB]
 */

export function hermiteShapeInto(s: number, l: number, out: Float64Array): void {
	const s2 = s * s;
	const s3 = s2 * s;

	// displacement w(s)
	out[0] = 1 - 3 * s2 + 2 * s3;
	out[1] = l * (s - 2 * s2 + s3);
	out[2] = 3 * s2 - 2 * s3;
	out[3] = l * (-s2 + s3);
}

export function hermiteD2Into(s: number, l: number, out: Float64Array): void {
	// Second derivative w''(s) is used to compute curvature.
	const l2 = l * l;
	const l2Inv = 1 / l2;
	const sixS = 6 * s;

	out[0] = (-6 + 12 * s) * l2Inv;
	out[1] = l * (-4 + sixS) * l2Inv;
	out[2] = (6 - 12 * s) * l2Inv;
	out[3] = l * (-2 + sixS) * l2Inv;
}

