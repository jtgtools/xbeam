import { bench } from 'vitest';
import { analyzeBeamChartReady, BeamInput } from '../src/index';

const beam: BeamInput = {
	length: 5,
	modulusOfElasticity: 200e9,
	momentOfInertia: 1e-6,
	supports: [{ kind: 'PINNED', position: 0 }, { kind: 'ROLLER', position: 5 }],
	pointLoads: [],
	distributedLoads: [{ startMagnitude: -1000, endMagnitude: -1000, startPosition: 0, endPosition: 5 }],
	appliedMoments: []
};

const meshOptions = { maxElements: 200 };

bench('analyzeBeamChartReady 200 elements', () => {
	analyzeBeamChartReady(beam, meshOptions);
}, { iterations: 1000 });