import type { BeamDiagrams, BeamInput, BeamResults, DiagramOptions, MeshOptions } from './types';
import { generateMesh } from './mesh';
import { assembleSystem, getBoundaryConditions } from './assembler';
import { solveLinearSystem, createSolverBuffers, solveLinearSystemBuffered } from './solver';
import { computeNodalResponses } from './postprocess';
import { sampleDiagrams } from './diagrams';

/**
 * Solves a static linear Euler-Bernoulli beam model and returns nodal responses
 * (deflection/rotation, moments, shears, and support reactions).
 */
export function analyzeBeam(beam: BeamInput, meshOptions?: MeshOptions): BeamResults {
	const mesh = generateMesh(beam, meshOptions);
	const system = assembleSystem(beam, mesh);
	const bc = getBoundaryConditions(beam, mesh);
	const solved = solveLinearSystem(system, bc);
	return computeNodalResponses(beam, mesh, solved.displacements, solved.reactions);
}

/**
 * Convenience wrapper that also returns chart-ready diagram series:
 * `deflection`, `moment`, and `shear`.
 *
 * Diagram series include discontinuity-friendly duplicate `x` coordinates.
 */
export function analyzeBeamChartReady(
	beam: BeamInput,
	meshOptions?: MeshOptions,
	diagramOptions?: DiagramOptions
): { results: BeamResults; diagrams: BeamDiagrams } {
	const mesh = generateMesh(beam, meshOptions);
	const system = assembleSystem(beam, mesh);
	const bc = getBoundaryConditions(beam, mesh);
	const solved = solveLinearSystem(system, bc);
	const results = computeNodalResponses(beam, mesh, solved.displacements, solved.reactions);
	const diagrams = sampleDiagrams(beam, mesh, results, diagramOptions);
	return { results, diagrams };
}

export { createSolverBuffers, solveLinearSystemBuffered };

export { assembleSystem, getBoundaryConditions } from './assembler';
export { generateMesh } from './mesh';

export * from './types';

