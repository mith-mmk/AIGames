(function (globalScope) {
    "use strict";

    const LAYER_DEFINITIONS = Object.freeze([
        { key: "letters", label: "書簡", coefficient: 1, color: "#3b6f8f" },
        { key: "mentions", label: "直接言及", coefficient: 0.7, color: "#a35f3f" },
        { key: "transmissions", label: "明示的伝達", coefficient: 0.4, color: "#8963a8" },
        { key: "themes", label: "共通論争・テーマ", coefficient: 0.5, color: "#4f8467" },
        { key: "meetings", label: "面会", coefficient: 0.3, color: "#b08a32" },
    ]);

    const EVENT_LAYER = Object.freeze({
        mention: "mentions",
        transmission: "transmissions",
        theme: "themes",
        meeting: "meetings",
    });

    function pairKey(left, right) {
        return left < right ? `${left}::${right}` : `${right}::${left}`;
    }

    function clamp(value, minimum, maximum) {
        return Math.min(maximum, Math.max(minimum, Number(value)));
    }

    function yearFromDate(value) {
        if (typeof value !== "string") return null;
        const match = value.match(/^(\d{4})/);
        return match ? Number(match[1]) : null;
    }

    function getDateRange(record) {
        const start = yearFromDate(record.dateStart);
        const end = yearFromDate(record.dateEnd);
        if (start === null && end === null) return null;
        return {
            start: start === null ? end : start,
            end: end === null ? start : end,
        };
    }

    function overlapsPeriod(record, startYear, endYear) {
        const range = getDateRange(record);
        return Boolean(range && range.start <= endYear && range.end >= startYear);
    }

    function combinations(values) {
        const result = [];
        for (let left = 0; left < values.length; left += 1) {
            for (let right = left + 1; right < values.length; right += 1) {
                result.push([values[left], values[right]]);
            }
        }
        return result;
    }

    function validateDataset(dataset) {
        const errors = [];
        const warnings = [];
        const people = Array.isArray(dataset?.people) ? dataset.people : [];
        const letters = Array.isArray(dataset?.letters) ? dataset.letters : [];
        const evidenceEvents = Array.isArray(dataset?.evidenceEvents) ? dataset.evidenceEvents : [];
        const personIds = new Set();
        const recordIds = new Set();
        const familyIds = new Set();
        let unresolvedLetters = 0;
        let invalidDates = 0;
        let duplicateFamilies = 0;
        let missingSources = 0;

        people.forEach((person, index) => {
            if (!person?.id) errors.push(`people[${index}] has no id`);
            if (personIds.has(person.id)) errors.push(`duplicate person id: ${person.id}`);
            personIds.add(person.id);
            if (!person?.preferredName) warnings.push(`person ${person.id || index} has no preferredName`);
        });

        letters.forEach((letter, index) => {
            if (!letter?.id) errors.push(`letters[${index}] has no id`);
            if (recordIds.has(letter.id)) errors.push(`duplicate letter id: ${letter.id}`);
            recordIds.add(letter.id);
            if (!personIds.has(letter.senderId) || !personIds.has(letter.recipientId)) unresolvedLetters += 1;
            const range = getDateRange(letter);
            if (!range || range.start > range.end) invalidDates += 1;
            if (letter.letterFamilyId) {
                if (familyIds.has(letter.letterFamilyId)) duplicateFamilies += 1;
                familyIds.add(letter.letterFamilyId);
            }
            if (!Array.isArray(letter.sourceRecords) || letter.sourceRecords.length === 0) missingSources += 1;
        });

        evidenceEvents.forEach((event, index) => {
            if (!event?.id) errors.push(`evidenceEvents[${index}] has no id`);
            if (!EVENT_LAYER[event?.type]) errors.push(`unknown evidence type: ${event?.type}`);
            if (!event?.sourceCitation || !event?.sourceUrl || !event?.evidenceLocator) missingSources += 1;
            if (!getDateRange(event)) invalidDates += 1;
        });

        if (unresolvedLetters > 0) warnings.push(`${unresolvedLetters} letters have unresolved endpoints`);
        if (invalidDates > 0) warnings.push(`${invalidDates} records have invalid or missing dates`);
        if (duplicateFamilies > 0) warnings.push(`${duplicateFamilies} duplicate letter families are present`);
        if (missingSources > 0) warnings.push(`${missingSources} records have missing source metadata`);

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            stats: {
                people: people.length,
                letters: letters.length,
                evidenceEvents: evidenceEvents.length,
                unresolvedLetters,
                invalidDates,
                duplicateFamilies,
                missingSources,
            },
        };
    }

    class NaturalPhilosophyNetworkCore {
        constructor(dataset, options = {}) {
            this.dataset = dataset || { people: [], letters: [], evidenceEvents: [], topics: [], audit: {} };
            this.peopleById = new Map((this.dataset.people || []).map((person) => [person.id, person]));
            this.options = {
                minYear: options.minYear ?? 1600,
                maxYear: options.maxYear ?? 1660,
                maxDisplayedEdges: options.maxDisplayedEdges ?? 800,
            };
            this.validation = validateDataset(this.dataset);
            this.init();
        }

        init() {
            this.startYear = this.options.minYear;
            this.endYear = this.options.maxYear;
            this.layerEnabled = Object.fromEntries(LAYER_DEFINITIONS.map((layer) => [layer.key, true]));
            this.coefficients = Object.fromEntries(LAYER_DEFINITIONS.map((layer) => [layer.key, layer.coefficient]));
            this.showWeakEdges = false;
            this.removedNodeId = null;
            this.lastGraph = null;
            return this.buildGraph();
        }

        setPeriod(startYear, endYear) {
            const start = clamp(Math.round(startYear), this.options.minYear, this.options.maxYear);
            const end = clamp(Math.round(endYear), this.options.minYear, this.options.maxYear);
            this.startYear = Math.min(start, end);
            this.endYear = Math.max(start, end);
        }

        setLayerEnabled(key, enabled) {
            if (!(key in this.layerEnabled)) return false;
            this.layerEnabled[key] = Boolean(enabled);
            return true;
        }

        setCoefficient(key, value) {
            if (!(key in this.coefficients)) return false;
            this.coefficients[key] = clamp(value, 0, 1);
            return true;
        }

        setShowWeakEdges(enabled) {
            this.showWeakEdges = Boolean(enabled);
        }

        setRemovedNode(personId) {
            this.removedNodeId = this.peopleById.has(personId) ? personId : null;
        }

        getPerson(personId) {
            return this.peopleById.get(personId) || null;
        }

        getLayerDefinitions() {
            return LAYER_DEFINITIONS;
        }

        getEventPairs(event) {
            const participants = [...new Set((event.participants || []).filter((id) => this.peopleById.has(id)))];
            if (event.type === "transmission" && Array.isArray(event.route) && event.route.length > 1) {
                return event.route.slice(0, -1).map((id, index) => [id, event.route[index + 1]])
                    .filter(([left, right]) => left !== right && this.peopleById.has(left) && this.peopleById.has(right));
            }
            if (event.type === "mention" && participants.length > 1) return [[participants[0], participants[1]]];
            return combinations(participants);
        }

        createEmptyEdge(left, right) {
            const [source, target] = left < right ? [left, right] : [right, left];
            return {
                key: pairKey(source, target),
                source,
                target,
                counts: Object.fromEntries(LAYER_DEFINITIONS.map((layer) => [layer.key, 0])),
                normalized: Object.fromEntries(LAYER_DEFINITIONS.map((layer) => [layer.key, 0])),
                contributions: Object.fromEntries(LAYER_DEFINITIONS.map((layer) => [layer.key, 0])),
                letterIds: [],
                evidenceIds: [],
                uncertain: false,
                weight: 0,
            };
        }

        buildAggregates(excludedIds = new Set()) {
            const edges = new Map();
            const nodeLetterCounts = new Map();
            const usedFamilies = new Set();
            let letterCount = 0;

            const getEdge = (left, right) => {
                const key = pairKey(left, right);
                if (!edges.has(key)) edges.set(key, this.createEmptyEdge(left, right));
                return edges.get(key);
            };

            (this.dataset.letters || []).forEach((letter) => {
                if (letter.excludeFromGraph || !overlapsPeriod(letter, this.startYear, this.endYear)) return;
                if (!this.peopleById.has(letter.senderId) || !this.peopleById.has(letter.recipientId)) return;
                if (letter.senderId === letter.recipientId || excludedIds.has(letter.senderId) || excludedIds.has(letter.recipientId)) return;
                const familyId = letter.letterFamilyId || letter.id;
                if (usedFamilies.has(familyId)) return;
                usedFamilies.add(familyId);
                const edge = getEdge(letter.senderId, letter.recipientId);
                edge.counts.letters += 1;
                edge.letterIds.push(letter.id);
                edge.uncertain ||= letter.datePrecision !== "exact";
                nodeLetterCounts.set(letter.senderId, (nodeLetterCounts.get(letter.senderId) || 0) + 1);
                nodeLetterCounts.set(letter.recipientId, (nodeLetterCounts.get(letter.recipientId) || 0) + 1);
                letterCount += 1;
            });

            (this.dataset.evidenceEvents || []).forEach((event) => {
                const layer = EVENT_LAYER[event.type];
                if (!layer || !overlapsPeriod(event, this.startYear, this.endYear)) return;
                this.getEventPairs(event).forEach(([left, right]) => {
                    if (excludedIds.has(left) || excludedIds.has(right)) return;
                    const edge = getEdge(left, right);
                    edge.counts[layer] += 1;
                    edge.evidenceIds.push(event.id);
                    edge.uncertain ||= event.datePrecision !== "exact";
                });
            });

            const maxima = Object.fromEntries(LAYER_DEFINITIONS.map((layer) => [layer.key, 0]));
            edges.forEach((edge) => {
                LAYER_DEFINITIONS.forEach((layer) => {
                    maxima[layer.key] = Math.max(maxima[layer.key], edge.counts[layer.key]);
                });
            });

            const activeEdges = [];
            edges.forEach((edge) => {
                LAYER_DEFINITIONS.forEach((layer) => {
                    const maximum = maxima[layer.key];
                    const normalized = maximum > 0 ? Math.log1p(edge.counts[layer.key]) / Math.log1p(maximum) : 0;
                    edge.normalized[layer.key] = normalized;
                    edge.contributions[layer.key] = this.layerEnabled[layer.key] ? normalized * this.coefficients[layer.key] : 0;
                });
                edge.weight = LAYER_DEFINITIONS.reduce((sum, layer) => sum + edge.contributions[layer.key], 0);
                if (edge.weight > 0) activeEdges.push(edge);
            });

            return { edges: activeEdges, maxima, letterCount, nodeLetterCounts };
        }

        buildAdjacency(nodes, edges) {
            const adjacency = new Map(nodes.map((node) => [node.id, []]));
            edges.forEach((edge) => {
                adjacency.get(edge.source)?.push({ id: edge.target, weight: edge.weight });
                adjacency.get(edge.target)?.push({ id: edge.source, weight: edge.weight });
            });
            return adjacency;
        }

        calculateComponents(nodes, adjacency) {
            const visited = new Set();
            const components = [];
            nodes.forEach((node) => {
                if (visited.has(node.id)) return;
                const component = [];
                const queue = [node.id];
                visited.add(node.id);
                while (queue.length > 0) {
                    const current = queue.shift();
                    component.push(current);
                    (adjacency.get(current) || []).forEach((neighbor) => {
                        if (!visited.has(neighbor.id)) {
                            visited.add(neighbor.id);
                            queue.push(neighbor.id);
                        }
                    });
                }
                components.push(component);
            });
            return components.sort((left, right) => right.length - left.length);
        }

        calculateBetweenness(nodes, adjacency) {
            const ids = nodes.map((node) => node.id);
            const centrality = new Map(ids.map((id) => [id, 0]));
            const epsilon = 1e-9;

            ids.forEach((source) => {
                const stack = [];
                const predecessors = new Map(ids.map((id) => [id, []]));
                const paths = new Map(ids.map((id) => [id, 0]));
                const distances = new Map(ids.map((id) => [id, Infinity]));
                const unvisited = new Set(ids);
                paths.set(source, 1);
                distances.set(source, 0);

                while (unvisited.size > 0) {
                    let current = null;
                    let currentDistance = Infinity;
                    unvisited.forEach((id) => {
                        if (distances.get(id) < currentDistance) {
                            current = id;
                            currentDistance = distances.get(id);
                        }
                    });
                    if (current === null || currentDistance === Infinity) break;
                    unvisited.delete(current);
                    stack.push(current);
                    (adjacency.get(current) || []).forEach((neighbor) => {
                        if (!unvisited.has(neighbor.id)) return;
                        const candidate = currentDistance + 1 / Math.max(neighbor.weight, epsilon);
                        const known = distances.get(neighbor.id);
                        if (candidate < known - epsilon) {
                            distances.set(neighbor.id, candidate);
                            paths.set(neighbor.id, paths.get(current));
                            predecessors.set(neighbor.id, [current]);
                        } else if (Math.abs(candidate - known) <= epsilon) {
                            paths.set(neighbor.id, paths.get(neighbor.id) + paths.get(current));
                            predecessors.get(neighbor.id).push(current);
                        }
                    });
                }

                const dependency = new Map(ids.map((id) => [id, 0]));
                while (stack.length > 0) {
                    const target = stack.pop();
                    predecessors.get(target).forEach((predecessor) => {
                        const divisor = paths.get(target);
                        if (divisor > 0) {
                            dependency.set(predecessor, dependency.get(predecessor)
                                + paths.get(predecessor) / divisor * (1 + dependency.get(target)));
                        }
                    });
                    if (target !== source) centrality.set(target, centrality.get(target) + dependency.get(target));
                }
            });

            const normalizer = ids.length > 2 ? (ids.length - 1) * (ids.length - 2) : 1;
            centrality.forEach((value, id) => centrality.set(id, value / normalizer));
            return centrality;
        }

        calculateNodeMetrics(nodes, edges, nodeLetterCounts) {
            const adjacency = this.buildAdjacency(nodes, edges);
            const betweenness = this.calculateBetweenness(nodes, adjacency);
            const metrics = new Map(nodes.map((node) => [node.id, {
                degree: adjacency.get(node.id)?.length || 0,
                strength: 0,
                betweenness: betweenness.get(node.id) || 0,
                letters: nodeLetterCounts.get(node.id) || 0,
            }]));
            edges.forEach((edge) => {
                metrics.get(edge.source).strength += edge.weight;
                metrics.get(edge.target).strength += edge.weight;
            });
            return { metrics, adjacency };
        }

        buildGraph() {
            const excluded = new Set(this.removedNodeId ? [this.removedNodeId] : []);
            const nodes = (this.dataset.people || []).filter((person) => !excluded.has(person.id));
            const aggregate = this.buildAggregates(excluded);
            const { metrics, adjacency } = this.calculateNodeMetrics(nodes, aggregate.edges, aggregate.nodeLetterCounts);
            const components = this.calculateComponents(nodes, adjacency);
            const sortedEdges = [...aggregate.edges].sort((left, right) => right.weight - left.weight || left.key.localeCompare(right.key));
            const displayedEdges = this.showWeakEdges ? sortedEdges : sortedEdges.slice(0, this.options.maxDisplayedEdges);
            this.lastGraph = {
                nodes,
                edges: aggregate.edges,
                displayedEdges,
                metrics,
                adjacency,
                components,
                maxima: aggregate.maxima,
                letterCount: aggregate.letterCount,
                period: { start: this.startYear, end: this.endYear },
                removedNodeId: this.removedNodeId,
            };
            return this.lastGraph;
        }

        getRanking(metric = "betweenness", limit = 10, graph = this.lastGraph || this.buildGraph()) {
            return graph.nodes.map((person) => ({ person, value: graph.metrics.get(person.id)?.[metric] || 0 }))
                .sort((left, right) => right.value - left.value || left.person.preferredName.localeCompare(right.person.preferredName))
                .slice(0, limit);
        }

        getHistogram() {
            const histogram = new Map();
            for (let year = this.options.minYear; year <= this.options.maxYear; year += 1) histogram.set(year, 0);
            const usedFamilies = new Set();
            (this.dataset.letters || []).forEach((letter) => {
                if (letter.excludeFromGraph || !this.peopleById.has(letter.senderId) || !this.peopleById.has(letter.recipientId)) return;
                const familyId = letter.letterFamilyId || letter.id;
                if (usedFamilies.has(familyId)) return;
                usedFamilies.add(familyId);
                const range = getDateRange(letter);
                if (!range) return;
                const start = Math.max(range.start, this.options.minYear);
                const end = Math.min(range.end, this.options.maxYear);
                if (start > end) return;
                const share = 1 / (end - start + 1);
                for (let year = start; year <= end; year += 1) histogram.set(year, histogram.get(year) + share);
            });
            return [...histogram].map(([year, count]) => ({ year, count }));
        }

        countReachablePairs(components, excludedId = null) {
            return components.reduce((sum, component) => {
                const size = component.length - (excludedId && component.includes(excludedId) ? 1 : 0);
                return sum + Math.max(0, size * (size - 1) / 2);
            }, 0);
        }

        analyzeRemoval(personId) {
            if (!this.peopleById.has(personId)) return null;
            const allNodes = this.dataset.people || [];
            const baselineAggregate = this.buildAggregates(new Set());
            const baselineCalculation = this.calculateNodeMetrics(allNodes, baselineAggregate.edges, baselineAggregate.nodeLetterCounts);
            const baselineComponents = this.calculateComponents(allNodes, baselineCalculation.adjacency);
            const remainingNodes = allNodes.filter((person) => person.id !== personId);
            const removedAggregate = this.buildAggregates(new Set([personId]));
            const removedCalculation = this.calculateNodeMetrics(remainingNodes, removedAggregate.edges, removedAggregate.nodeLetterCounts);
            const removedComponents = this.calculateComponents(remainingNodes, removedCalculation.adjacency);
            const baselineReachable = this.countReachablePairs(baselineComponents, personId);
            const removedReachable = this.countReachablePairs(removedComponents);
            const newlyIsolated = remainingNodes.filter((person) => {
                const before = baselineCalculation.metrics.get(person.id)?.degree || 0;
                const after = removedCalculation.metrics.get(person.id)?.degree || 0;
                return before > 0 && after === 0;
            });
            return {
                person: this.getPerson(personId),
                before: {
                    components: baselineComponents.length,
                    largestComponent: baselineComponents[0]?.length || 0,
                    reachablePairs: baselineReachable,
                },
                after: {
                    components: removedComponents.length,
                    largestComponent: removedComponents[0]?.length || 0,
                    reachablePairs: removedReachable,
                },
                newlyIsolated,
                reachablePairLoss: baselineReachable - removedReachable,
                reachablePairLossRatio: baselineReachable > 0 ? (baselineReachable - removedReachable) / baselineReachable : 0,
            };
        }

        getEdgeByKey(key, graph = this.lastGraph || this.buildGraph()) {
            return graph.edges.find((edge) => edge.key === key) || null;
        }

        getLetterById(id) {
            return (this.dataset.letters || []).find((letter) => letter.id === id) || null;
        }

        getEvidenceById(id) {
            return (this.dataset.evidenceEvents || []).find((event) => event.id === id) || null;
        }
    }

    globalScope.NaturalPhilosophyNetworkCore = NaturalPhilosophyNetworkCore;
    globalScope.NATURAL_PHILOSOPHY_LAYERS = LAYER_DEFINITIONS;
    globalScope.NaturalPhilosophyNetworkTools = {
        pairKey,
        overlapsPeriod,
        getDateRange,
        validateDataset,
    };
}(typeof globalThis !== "undefined" ? globalThis : window));
