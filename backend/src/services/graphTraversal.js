export function depthFirstSearch(graph, start, maxNodes = 200) {
  if (!graph.has(start)) return { order: [], visited: [] };

  const visited = new Set();
  const order = [];
  const stack = [start];

  while (stack.length > 0 && order.length < maxNodes) {
    const current = stack.pop();

    if (visited.has(current)) continue;

    visited.add(current);
    order.push(current);

    const neighbors = [...(graph.get(current) || [])].sort().reverse();

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) stack.push(neighbor);
    }
  }

  return { order, visited: [...visited] };
}

export function breadthFirstSearch(graph, start, maxNodes = 200) {
  if (!graph.has(start)) return { order: [], visited: [], distances: {} };

  const visited = new Set([start]);
  const order = [];
  const distances = { [start]: 0 };
  const queue = [start];
  let head = 0;

  while (head < queue.length && order.length < maxNodes) {
    const current = queue[head++];
    order.push(current);

    for (const neighbor of [...(graph.get(current) || [])].sort()) {
      if (visited.has(neighbor)) continue;

      visited.add(neighbor);
      distances[neighbor] = distances[current] + 1;
      queue.push(neighbor);
    }
  }

  return { order, visited: [...visited], distances };
}
