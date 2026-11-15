import { createJevDuplicatePairsDetector } from "./jev-duplicate-detector.js";

function mergeConnectedPairs(count, pairs) {
    const adjacency = Array.from({ length: count }, () => []);
    for (const [a, b] of pairs) {
        adjacency[a].push(b);
        adjacency[b].push(a);
    }

    const visited = new Set();
    const groups = [];
    for (let start = 0; start < count; start++) {
        if (visited.has(start) || adjacency[start].length === 0) {
            continue;
        }
        const group = [];
        const stack = [start];
        visited.add(start);
        while (stack.length > 0) {
            const current = stack.pop();
            group.push(current);
            for (const neighbor of adjacency[current]) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    stack.push(neighbor);
                }
            }
        }
        group.sort((a, b) => a - b);
        groups.push(group);
    }
    return groups;
}

export function createDuplicateConsiderationsDetector({
    detectDuplicatePairs,
    ...providerOptions
} = {}) {
    const findPairs =
        detectDuplicatePairs ??
        createJevDuplicatePairsDetector(providerOptions);

    return async function detectDuplicateConsiderations(considerations) {
        if (considerations.length < 2) {
            return [];
        }
        const duplicatePairs = await findPairs(considerations);
        return mergeConnectedPairs(considerations.length, duplicatePairs);
    };
}
