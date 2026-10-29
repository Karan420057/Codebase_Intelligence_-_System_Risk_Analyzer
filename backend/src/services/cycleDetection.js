export function detectCycles(graph, maxCycles = 100) {
  const state = new Map();
  const stack = [];
  const stackPositions = new Map();
  const cycles = [];
  const cycleKeys = new Set();

  function visit(node) {
    if (cycles.length >= maxCycles) return;

    state.set(node, 1);
    stackPositions.set(node, stack.length);
    stack.push(node);

    for (const neighbor of graph.get(node) || []) {
      if (cycles.length >= maxCycles) break;

      if (!state.has(neighbor)) {
        visit(neighbor);
      } else if (state.get(neighbor) === 1) {
        const position = stackPositions.get(neighbor);
        const cycle = [...stack.slice(position), neighbor];
        const key = cycle.slice(0, -1).slice().sort().join('|');

        if (!cycleKeys.has(key)) {
          cycleKeys.add(key);
          cycles.push(cycle);
        }
      }
    }

    stack.pop();
    stackPositions.delete(node);
    state.set(node, 2);
  }

  for (const node of graph.keys()) {
    if (!state.has(node)) visit(node);
    if (cycles.length >= maxCycles) break;
  }

  return {
    cycles,
    cycleCount: cycles.length,
    truncated: cycles.length >= maxCycles,
  };
}
