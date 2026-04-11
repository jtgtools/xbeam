export const DOF_PER_NODE = 2;

// Hermite Euler-Bernoulli element for each node pair couples at most 3 DOFs away
// in the global ordering [w0, theta0, w1, theta1, ...].
export const HALF_BANDWIDTH = 3;

export const TOLERANCE = 1e-9;

// Default mesh controls
export const DEFAULT_MAX_ELEMENTS = 200;
export const DEFAULT_MIN_ELEMENTS_PER_SEGMENT = 2;

// Default diagram controls
export const DEFAULT_DIAGRAM_POINTS_PER_ELEMENT = 12;

