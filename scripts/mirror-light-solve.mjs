import { LEVELS } from '../web/js/mirror-light/levels.mjs';
import { solveLevel, traceLight } from '../web/js/mirror-light/core.mjs';
const results = LEVELS.map(level => {
  const result = solveLevel(level);
  if (!result.best || result.minimum !== level.expectedMinimum || !traceLight(level, result.best.orientations).won) throw new Error(`Stage ${level.id}: invalid solution or minimum`);
  return {
    stage: level.id, title: level.title, minimum: result.minimum,
    configurations: result.configurations, solutions: result.solutions.length,
    optimalConfigurations: result.optimalConfigurations, distinctRoutes: result.distinctRoutes,
    bends: result.best.bends, rotatingMirrors: level.mirrors.filter(m => !m.fixed).length,
    fixedMirrors: level.mirrors.filter(m => m.fixed).length, checkpoints: level.checkpoints.length,
    actions: result.best.actions.map(i => level.mirrors[i].id),
    orientation: Object.fromEntries(level.mirrors.map((m, i) => [m.id, result.best.orientations[i] === 0 ? '/' : '\\'])),
    path: result.best.mirrorOrder,
  };
});
console.log(JSON.stringify(results, null, 2));
