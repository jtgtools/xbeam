export type SupportKind = 'ROLLER' | 'PINNED' | 'FIXED';

export interface Support {
	kind: SupportKind;
	position: number; // m
}

export interface PointLoad {
	/**
	 * Force magnitude in N.
	 * Upward positive, downward negative.
	 */
	magnitude: number;
	position: number; // m
}

export interface DistributedLoad {
	/**
	 * Linearly varying distributed load intensity q(x) in N/m.
	 * Sign convention matches `PointLoad`.
	 */
	startMagnitude: number; // N/m at startPosition
	endMagnitude: number; // N/m at endPosition
	startPosition: number; // m
	endPosition: number; // m
}

export interface AppliedMoment {
	/**
	 * Concentrated bending moment at a point, in N·m.
	 * Positive sagging convention is used internally.
	 */
	magnitude: number;
	position: number; // m
}

export interface BeamInput {
	length: number; // m
	modulusOfElasticity: number; // Pa
	momentOfInertia: number; // m^4

	supports: Support[];
	pointLoads: PointLoad[];
	distributedLoads: DistributedLoad[];
	appliedMoments?: AppliedMoment[];
}

export interface BeamReactions {
	/**
	 * Vertical reaction force per node (size nNodes).
	 * Upward positive (same sign convention as point loads).
	 */
	vertical: Float64Array;
	/**
	 * Reaction moment per node associated with rotation DOF (size nNodes).
	 * Non-zero only for `FIXED` supports.
	 */
	moment: Float64Array;
}

export interface BeamResults {
	nodePositions: Float64Array; // size = nNodes
	deflections: Float64Array; // w(x) (size nNodes)
	rotations: Float64Array; // theta(x) (size nNodes)

	/**
	 * Nodal bending moments averaged from element-end curvatures.
	 */
	moments: Float64Array; // size nNodes

	/**
	 * Nodal shear using right-side semantics V(x+).
	 */
	shears: Float64Array; // size nNodes

	reactions: BeamReactions;
}

export interface XYSeries {
	x: Float64Array;
	y: Float64Array;
}

export interface BeamDiagrams {
	deflection: XYSeries;
	moment: XYSeries;
	shear: XYSeries;
}

export interface DiagramOptions {
	pointsPerElement?: number; // default ~12
	eps?: number; // default 1e-9
	includeOutsideEnds?: boolean; // add x=0- and x=L+ points for end discontinuities
}

export interface MeshOptions {
	maxElements?: number; // controls refinement density
	minElementsPerSegment?: number;
	eps?: number;
}

export interface Mesh {
	nodes: Float64Array;
	/**
	 * Find the closest node index to `x` if within `eps`, otherwise returns -1.
	 * This handles cases where user-provided load coordinates have small floating error.
	 */
	findNodeIndex: (x: number, eps: number) => number;
}

export interface LinearSystem {
	bandedK: Float64Array; // upper band storage, size nDof * (b+1)
	forceVector: Float64Array; // size nDof
	nodePositions: Float64Array;
}

export interface BoundaryConditions {
	freeDofs: Int32Array;
	restrainedDofs: Int32Array;
}

