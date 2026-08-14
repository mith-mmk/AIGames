(function (globalScope) {
    "use strict";

    const METRIC_LABELS = Object.freeze({
        betweenness: "媒介中心性",
        strength: "重み付き次数",
        degree: "接続人数",
        letters: "書簡数",
    });

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, (character) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
        }[character]));
    }

    function safeUrl(value) {
        try {
            const url = new URL(value);
            return ["http:", "https:"].includes(url.protocol) ? url.href : null;
        } catch {
            return null;
        }
    }

    function formatNumber(value, digits = 0) {
        return Number(value || 0).toLocaleString("ja-JP", { maximumFractionDigits: digits });
    }

    function sourceLink(url, label) {
        const safe = safeUrl(url);
        return safe ? `<a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>` : escapeHtml(label);
    }

    class NaturalPhilosophyNetworkApp {
        constructor(canvas, elements, dataset) {
            this.canvas = canvas;
            this.elements = elements;
            this.dataset = dataset;
            this.core = new globalScope.NaturalPhilosophyNetworkCore(dataset);
            this.renderer = new globalScope.NaturalPhilosophyNetworkRenderer(canvas);
            this.metric = "betweenness";
            this.selectedNodeId = null;
            this.selectedEdgeKey = null;
            this.removalAnalysis = null;
            this.renderTimer = null;
            this.resizeObserver = null;
        }

        init() {
            this.createLayerControls();
            this.createDecadePresets();
            this.createLegend();
            this.syncControls();
            const mersenne = (this.dataset.people || []).find((person) => /mersenne/i.test(`${person.id} ${person.preferredName}`));
            this.selectedNodeId = mersenne?.id || this.dataset.people?.[0]?.id || null;
            this.renderAll();
        }

        createLayerControls() {
            const eventCounts = (this.dataset.evidenceEvents || []).reduce((counts, event) => {
                const key = `${event.type}s`.replace("theme", "theme");
                counts[key] = (counts[key] || 0) + 1;
                return counts;
            }, {});
            const counts = { letters: this.dataset.letters?.length || 0, ...eventCounts };
            this.elements.layerControls.innerHTML = this.core.getLayerDefinitions().map((layer) => {
                const available = (counts[layer.key] || 0) > 0;
                if (!available) this.core.setLayerEnabled(layer.key, false);
                return `
                <div class="layer-row" data-layer="${escapeHtml(layer.key)}">
                    <label class="layer-toggle" for="layer-${escapeHtml(layer.key)}">
                        <input id="layer-${escapeHtml(layer.key)}" type="checkbox" data-layer-toggle="${escapeHtml(layer.key)}"${available ? " checked" : " disabled"}>
                        <span class="layer-swatch" style="background-color:${escapeHtml(layer.color)}"></span>
                        <span>${escapeHtml(layer.label)}${available ? "" : "（未収録）"}</span>
                    </label>
                    <output id="coefficient-${escapeHtml(layer.key)}" for="weight-${escapeHtml(layer.key)}">${layer.coefficient.toFixed(1)}</output>
                    <input id="weight-${escapeHtml(layer.key)}" data-layer-weight="${escapeHtml(layer.key)}" type="range" min="0" max="1" step="0.1" value="${layer.coefficient}"${available ? "" : " disabled"}>
                </div>`;
            }).join("");
        }

        createDecadePresets() {
            const decades = [1600, 1610, 1620, 1630, 1640, 1650];
            this.elements.decadePresets.innerHTML = decades.map((year) => `<button type="button" data-period-start="${year}" data-period-end="${year + 9}">${year}s</button>`).join("")
                + `<button type="button" data-period-start="1600" data-period-end="1660">全期間</button>`;
        }

        createLegend() {
            this.elements.graphLegend.innerHTML = this.core.getLayerDefinitions().map((layer) => `<span><i style="background-color:${escapeHtml(layer.color)}"></i>${escapeHtml(layer.label)}</span>`).join("")
                + `<span><i class="uncertain-line"></i>推定日を含む</span>`;
        }

        syncControls() {
            this.elements.yearStart.value = `${this.core.startYear}`;
            this.elements.yearEnd.value = `${this.core.endYear}`;
            this.elements.yearStartValue.textContent = `${this.core.startYear}`;
            this.elements.yearEndValue.textContent = `${this.core.endYear}`;
            this.elements.showWeakEdges.checked = this.core.showWeakEdges;
            this.elements.rankingMetric.value = this.metric;
            this.core.getLayerDefinitions().forEach((layer) => {
                const toggle = this.elements.layerControls.querySelector(`[data-layer-toggle="${layer.key}"]`);
                const weight = this.elements.layerControls.querySelector(`[data-layer-weight="${layer.key}"]`);
                const output = this.elements.layerControls.querySelector(`#coefficient-${layer.key}`);
                if (toggle?.disabled) {
                    this.core.setLayerEnabled(layer.key, false);
                    toggle.checked = false;
                } else if (toggle) toggle.checked = this.core.layerEnabled[layer.key];
                if (weight) weight.value = `${this.core.coefficients[layer.key]}`;
                if (output) output.textContent = this.core.coefficients[layer.key].toFixed(1);
            });
        }

        scheduleRender() {
            globalScope.clearTimeout(this.renderTimer);
            this.renderTimer = globalScope.setTimeout(() => this.renderAll(), 80);
        }

        setPeriod(start, end) {
            this.core.setPeriod(start, end);
            this.syncControls();
            this.scheduleRender();
        }

        updatePeriodFromControl(changedControl) {
            let start = Number(this.elements.yearStart.value);
            let end = Number(this.elements.yearEnd.value);
            if (start > end) {
                if (changedControl === "start") end = start;
                else start = end;
            }
            this.setPeriod(start, end);
        }

        setLayerEnabled(key, enabled) {
            this.core.setLayerEnabled(key, enabled);
            this.scheduleRender();
        }

        setLayerWeight(key, value) {
            this.core.setCoefficient(key, value);
            const output = this.elements.layerControls.querySelector(`#coefficient-${key}`);
            if (output) output.textContent = this.core.coefficients[key].toFixed(1);
            this.scheduleRender();
        }

        setMetric(metric) {
            if (!(metric in METRIC_LABELS)) return;
            this.metric = metric;
            this.renderAll();
        }

        resetSettings() {
            this.core.init();
            this.metric = "betweenness";
            this.selectedEdgeKey = null;
            this.removalAnalysis = null;
            this.syncControls();
            this.renderAll();
        }

        selectNode(personId) {
            if (!this.core.getPerson(personId)) return;
            this.selectedNodeId = personId;
            this.selectedEdgeKey = null;
            this.renderer.setSelection(personId, null);
            this.renderLists(this.core.lastGraph);
            this.renderDetail(this.core.lastGraph);
        }

        selectEdge(edgeKey) {
            if (!this.core.getEdgeByKey(edgeKey)) return;
            this.selectedEdgeKey = edgeKey;
            this.selectedNodeId = null;
            this.renderer.setSelection(null, edgeKey);
            this.renderLists(this.core.lastGraph);
            this.renderDetail(this.core.lastGraph);
        }

        removePerson(personId) {
            const analysis = this.core.analyzeRemoval(personId);
            if (!analysis) return;
            this.removalAnalysis = analysis;
            this.core.setRemovedNode(personId);
            this.selectedNodeId = null;
            this.selectedEdgeKey = null;
            this.renderAll();
        }

        clearRemoval() {
            const personId = this.removalAnalysis?.person?.id || null;
            this.core.setRemovedNode(null);
            this.removalAnalysis = null;
            this.selectedNodeId = personId;
            this.renderAll();
        }

        renderAll() {
            const graph = this.core.buildGraph();
            if (this.selectedNodeId && !graph.nodes.some((node) => node.id === this.selectedNodeId)) this.selectedNodeId = null;
            if (this.selectedEdgeKey && !graph.edges.some((edge) => edge.key === this.selectedEdgeKey)) this.selectedEdgeKey = null;
            this.renderer.setGraph(graph, this.metric);
            this.renderer.setSelection(this.selectedNodeId, this.selectedEdgeKey);
            this.renderOverview(graph);
            this.renderHistogram();
            this.renderLists(graph);
            this.renderDetail(graph);
            this.renderRemoval();
            this.renderMethodology();
        }

        renderOverview(graph) {
            this.elements.nodeCount.textContent = formatNumber(graph.nodes.length);
            this.elements.edgeCount.textContent = formatNumber(graph.edges.length);
            this.elements.letterCount.textContent = formatNumber(graph.letterCount);
            this.elements.componentCount.textContent = formatNumber(graph.components.length);
            this.elements.drawnEdgeCount.textContent = formatNumber(graph.displayedEdges.length);
            this.elements.graphTitle.textContent = `${graph.period.start}–${graph.period.end}年`;
            const omitted = graph.edges.length - graph.displayedEdges.length;
            this.elements.graphStatus.textContent = graph.removedNodeId
                ? `${this.removalAnalysis?.person?.displayNameJa || this.removalAnalysis?.person?.preferredName || "人物"}を除外中`
                : omitted > 0 ? `弱い辺 ${formatNumber(omitted)}本は描画省略（計算には使用）` : "すべての有効辺を描画";
        }

        renderHistogram() {
            const values = this.core.getHistogram();
            const maximum = Math.max(1, ...values.map((item) => item.count));
            this.elements.yearHistogram.innerHTML = values.map((item) => {
                const active = item.year >= this.core.startYear && item.year <= this.core.endYear;
                const height = Math.max(2, item.count / maximum * 100);
                return `<span class="year-bar${active ? " active" : ""}" title="${item.year}年: ${formatNumber(item.count, 2)}通相当"><i style="height:${height}%"></i><small>${item.year % 10 === 0 ? item.year : ""}</small></span>`;
            }).join("");
        }

        renderLists(graph) {
            const query = this.elements.personSearch.value.trim().toLocaleLowerCase();
            const filtered = graph.nodes.filter((person) => {
                const names = [person.preferredName, person.displayNameJa, ...(person.names || [])].join(" ").toLocaleLowerCase();
                return !query || names.includes(query);
            }).sort((left, right) => {
                const leftValue = graph.metrics.get(left.id)?.[this.metric] || 0;
                const rightValue = graph.metrics.get(right.id)?.[this.metric] || 0;
                return rightValue - leftValue || left.preferredName.localeCompare(right.preferredName);
            });
            this.elements.personListCount.textContent = `${filtered.length}人`;
            this.elements.personList.innerHTML = filtered.slice(0, 120).map((person) => {
                const metric = graph.metrics.get(person.id)?.[this.metric] || 0;
                const selected = person.id === this.selectedNodeId;
                return `<button type="button" role="option" aria-selected="${selected}" data-person-id="${escapeHtml(person.id)}">
                    <span>${escapeHtml(person.displayNameJa || person.preferredName)}</span>
                    <small>${this.formatMetric(this.metric, metric)}</small>
                </button>`;
            }).join("") || `<p class="empty-state">一致する人物はいません。</p>`;

            const ranking = this.core.getRanking(this.metric, 12, graph);
            this.elements.rankingLabel.textContent = METRIC_LABELS[this.metric];
            this.elements.rankingList.innerHTML = ranking.map((entry, index) => `<li>
                <button type="button" data-person-id="${escapeHtml(entry.person.id)}">
                    <span class="rank-number">${String(index + 1).padStart(2, "0")}</span>
                    <span>${escapeHtml(entry.person.displayNameJa || entry.person.preferredName)}</span>
                    <strong>${this.formatMetric(this.metric, entry.value)}</strong>
                </button>
            </li>`).join("");
        }

        formatMetric(metric, value) {
            if (metric === "betweenness") return formatNumber(value * 100, 2);
            if (metric === "strength") return formatNumber(value, 2);
            return formatNumber(value);
        }

        renderDetail(graph) {
            if (this.selectedEdgeKey) {
                const edge = this.core.getEdgeByKey(this.selectedEdgeKey, graph);
                this.renderEdgeDetail(edge);
                return;
            }
            const person = this.selectedNodeId ? this.core.getPerson(this.selectedNodeId) : null;
            this.renderPersonDetail(person, graph);
        }

        renderPersonDetail(person, graph) {
            this.elements.detailKind.textContent = "PERSON";
            if (!person) {
                this.elements.detailPanel.innerHTML = `<p class="empty-state">Canvasまたは人物一覧から人物を選択してください。</p>`;
                return;
            }
            const metric = graph.metrics.get(person.id) || { degree: 0, strength: 0, betweenness: 0, letters: 0 };
            const connections = graph.edges.filter((edge) => edge.source === person.id || edge.target === person.id)
                .sort((left, right) => right.weight - left.weight).slice(0, 8);
            const years = [person.birthYear, person.deathYear].filter((value) => value !== null && value !== undefined).join("–") || "生没年不詳";
            const authorities = (person.authorityUrls || []).map((entry) => {
                const url = typeof entry === "string" ? entry : entry.url;
                const label = typeof entry === "string" ? "典拠" : entry.label || entry.id || "典拠";
                return sourceLink(url, label);
            }).join(" / ");
            this.elements.detailPanel.innerHTML = `
                <div class="person-title"><h3>${escapeHtml(person.displayNameJa || person.preferredName)}</h3><span>${escapeHtml(years)}</span></div>
                <p class="latin-name">${escapeHtml(person.preferredName)}</p>
                <p>${escapeHtml((person.roles || []).join(" / ") || "役割情報なし")}</p>
                <dl class="metric-table">
                    <div><dt>媒介中心性</dt><dd>${formatNumber(metric.betweenness * 100, 2)}</dd></div>
                    <div><dt>重み付き次数</dt><dd>${formatNumber(metric.strength, 2)}</dd></div>
                    <div><dt>接続人数</dt><dd>${formatNumber(metric.degree)}</dd></div>
                    <div><dt>期間内書簡</dt><dd>${formatNumber(metric.letters)}</dd></div>
                </dl>
                <p class="selection-note">選出理由: ${escapeHtml(person.selectionReason || "記録なし")}${person.selectionCount ? `（種ノードとの書簡 ${formatNumber(person.selectionCount)}通）` : ""}</p>
                ${authorities ? `<p class="source-links">${authorities}</p>` : ""}
                <h4>強い接続</h4>
                <div class="connection-list">${connections.map((edge) => {
                    const otherId = edge.source === person.id ? edge.target : edge.source;
                    const other = this.core.getPerson(otherId);
                    return `<button type="button" data-edge-key="${escapeHtml(edge.key)}"><span>${escapeHtml(other?.displayNameJa || other?.preferredName || otherId)}</span><strong>${formatNumber(edge.weight, 2)}</strong></button>`;
                }).join("") || `<span class="empty-state">現在の条件では接続がありません。</span>`}</div>`;
        }

        renderEdgeDetail(edge) {
            this.elements.detailKind.textContent = "RELATION";
            if (!edge) {
                this.elements.detailPanel.innerHTML = `<p class="empty-state">関係が見つかりません。</p>`;
                return;
            }
            const source = this.core.getPerson(edge.source);
            const target = this.core.getPerson(edge.target);
            const layerRows = this.core.getLayerDefinitions().map((layer) => `<tr>
                <th>${escapeHtml(layer.label)}</th>
                <td>${formatNumber(edge.counts[layer.key])}</td>
                <td>${formatNumber(edge.normalized[layer.key], 3)}</td>
                <td>${formatNumber(edge.contributions[layer.key], 3)}</td>
            </tr>`).join("");
            const letters = edge.letterIds.slice(0, 12).map((id) => this.core.getLetterById(id)).filter(Boolean);
            const events = edge.evidenceIds.slice(0, 12).map((id) => this.core.getEvidenceById(id)).filter(Boolean);
            this.elements.detailPanel.innerHTML = `
                <div class="relation-title"><button type="button" data-person-id="${escapeHtml(source.id)}">${escapeHtml(source.displayNameJa || source.preferredName)}</button><span>↔</span><button type="button" data-person-id="${escapeHtml(target.id)}">${escapeHtml(target.displayNameJa || target.preferredName)}</button></div>
                <p>総合重み <strong>${formatNumber(edge.weight, 3)}</strong>${edge.uncertain ? " / 推定日を含む" : ""}</p>
                <table class="weight-table"><thead><tr><th>レイヤー</th><th>件数</th><th>正規化</th><th>寄与</th></tr></thead><tbody>${layerRows}</tbody></table>
                <h4>書簡記録</h4>
                <ul class="source-list">${letters.map((letter) => {
                    const record = letter.sourceRecords?.[0] || {};
                    const direction = `${this.core.getPerson(letter.senderId)?.displayNameJa || this.core.getPerson(letter.senderId)?.preferredName || letter.senderId} → ${this.core.getPerson(letter.recipientId)?.displayNameJa || this.core.getPerson(letter.recipientId)?.preferredName || letter.recipientId}`;
                    return `<li><span>${escapeHtml(letter.dateOriginal || letter.dateStart)} / ${escapeHtml(direction)}</span><small>${sourceLink(record.url || record.sourceUrl, record.citation || record.catalogue || "出典")}</small></li>`;
                }).join("") || "<li>書簡記録なし</li>"}</ul>
                ${edge.letterIds.length > letters.length ? `<p class="field-note">ほか ${edge.letterIds.length - letters.length}件</p>` : ""}
                <h4>追加証拠</h4>
                <ul class="source-list">${events.map((event) => `<li><span>${escapeHtml(event.sourceCitation)}</span><small>${sourceLink(event.sourceUrl, event.evidenceLocator || "根拠箇所")} / 確度 ${escapeHtml(event.confidence || "未記録")}</small></li>`).join("") || "<li>追加証拠なし</li>"}</ul>`;
        }

        renderRemoval() {
            const analysis = this.removalAnalysis;
            this.elements.clearRemovalButton.hidden = !analysis;
            this.elements.removalComparison.hidden = !analysis;
            if (!analysis) return;
            const name = analysis.person.displayNameJa || analysis.person.preferredName;
            this.elements.removalComparison.innerHTML = `
                <div class="card-heading"><h2>${escapeHtml(name)}を除いたネットワーク</h2><span>NODE REMOVAL</span></div>
                <div class="comparison-grid">
                    <div><span>連結成分</span><strong>${analysis.before.components} → ${analysis.after.components}</strong></div>
                    <div><span>最大成分</span><strong>${analysis.before.largestComponent} → ${analysis.after.largestComponent}</strong></div>
                    <div><span>到達可能な人物対</span><strong>−${formatNumber(analysis.reachablePairLoss)}</strong></div>
                    <div><span>到達可能性の低下</span><strong>${formatNumber(analysis.reachablePairLossRatio * 100, 1)}%</strong></div>
                    <div><span>新規孤立人物</span><strong>${formatNumber(analysis.newlyIsolated.length)}</strong></div>
                </div>
                ${analysis.newlyIsolated.length ? `<p>孤立: ${analysis.newlyIsolated.map((person) => escapeHtml(person.displayNameJa || person.preferredName)).join("、")}</p>` : ""}`;
        }

        renderMethodology() {
            const manifest = this.dataset.manifest || {};
            const audit = { ...(this.dataset.audit?.exclusions || {}), ...this.core.validation.stats };
            const sourceDescription = manifest.sourceVersion || manifest.source || "";
            this.elements.datasetSummary.textContent = `${manifest.title || "同梱ネットワークデータ"}。人物 ${formatNumber(this.dataset.people?.length)}人、書簡 ${formatNumber(this.dataset.letters?.length)}件、追加証拠 ${formatNumber(this.dataset.evidenceEvents?.length)}件。${sourceDescription ? `基礎データ: ${sourceDescription}。` : ""}`;
            const auditLabels = {
                unresolvedLetters: "未解決送受信者",
                invalidDates: "無効・無日付",
                duplicateFamilies: "重複family",
                missingSources: "出典欠損",
                unresolvedParticipants: "抽出時の送受信者不明",
                duplicateNormalizedObservations: "完全重複の除外",
            };
            this.elements.auditSummary.innerHTML = Object.entries(auditLabels).map(([key, label]) => `<div><span>${label}</span><strong>${formatNumber(audit[key] || 0)}</strong></div>`).join("");
        }
    }

    function bindNetworkEvents(app) {
        const elements = app.elements;
        elements.helpButton.addEventListener("click", () => elements.helpDialog.showModal());
        elements.yearStart.addEventListener("input", () => app.updatePeriodFromControl("start"));
        elements.yearEnd.addEventListener("input", () => app.updatePeriodFromControl("end"));
        elements.decadePresets.addEventListener("click", (event) => {
            const button = event.target.closest("[data-period-start]");
            if (button) app.setPeriod(button.dataset.periodStart, button.dataset.periodEnd);
        });
        elements.layerControls.addEventListener("change", (event) => {
            if (event.target.matches("[data-layer-toggle]")) app.setLayerEnabled(event.target.dataset.layerToggle, event.target.checked);
        });
        elements.layerControls.addEventListener("input", (event) => {
            if (event.target.matches("[data-layer-weight]")) app.setLayerWeight(event.target.dataset.layerWeight, event.target.value);
        });
        elements.showWeakEdges.addEventListener("change", () => {
            app.core.setShowWeakEdges(elements.showWeakEdges.checked);
            app.renderAll();
        });
        elements.rankingMetric.addEventListener("change", () => app.setMetric(elements.rankingMetric.value));
        elements.resetViewButton.addEventListener("click", () => app.renderer.resetView());
        elements.resetSettingsButton.addEventListener("click", () => app.resetSettings());
        elements.removeMersenneButton.addEventListener("click", () => {
            const person = app.dataset.people.find((candidate) => /mersenne/i.test(`${candidate.id} ${candidate.preferredName}`));
            if (person) app.removePerson(person.id);
        });
        elements.removeSelectedButton.addEventListener("click", () => {
            if (app.selectedNodeId) app.removePerson(app.selectedNodeId);
        });
        elements.clearRemovalButton.addEventListener("click", () => app.clearRemoval());
        elements.personSearch.addEventListener("input", () => app.renderLists(app.core.lastGraph));
        [elements.personList, elements.rankingList, elements.detailPanel].forEach((container) => {
            container.addEventListener("click", (event) => {
                const personButton = event.target.closest("[data-person-id]");
                const edgeButton = event.target.closest("[data-edge-key]");
                if (personButton) app.selectNode(personButton.dataset.personId);
                else if (edgeButton) app.selectEdge(edgeButton.dataset.edgeKey);
            });
        });

        app.canvas.addEventListener("pointerdown", (event) => {
            app.canvas.setPointerCapture(event.pointerId);
            app.renderer.beginPointer(event.clientX, event.clientY);
        });
        app.canvas.addEventListener("pointermove", (event) => {
            if (app.renderer.pointerState) app.renderer.movePointer(event.clientX, event.clientY);
            else app.renderer.updateHover(event.clientX, event.clientY);
        });
        const endPointer = (event) => {
            const selection = app.renderer.endPointer(event.clientX, event.clientY);
            if (selection.node) app.selectNode(selection.node.id);
            else if (selection.edge) app.selectEdge(selection.edge.key);
        };
        app.canvas.addEventListener("pointerup", endPointer);
        app.canvas.addEventListener("pointercancel", () => { app.renderer.pointerState = null; });
        app.canvas.addEventListener("wheel", (event) => {
            event.preventDefault();
            app.renderer.zoomAt(event.clientX, event.clientY, event.deltaY);
        }, { passive: false });
        app.canvas.addEventListener("keydown", (event) => {
            const pan = 42;
            const rect = app.canvas.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            if (event.key === "ArrowLeft") app.renderer.panBy(pan, 0);
            else if (event.key === "ArrowRight") app.renderer.panBy(-pan, 0);
            else if (event.key === "ArrowUp") app.renderer.panBy(0, pan);
            else if (event.key === "ArrowDown") app.renderer.panBy(0, -pan);
            else if (["+", "="].includes(event.key)) app.renderer.zoomAt(centerX, centerY, -1);
            else if (event.key === "-") app.renderer.zoomAt(centerX, centerY, 1);
            else if (event.key === "Home") app.renderer.resetView();
            else return;
            event.preventDefault();
        });

        if (typeof globalScope.ResizeObserver === "function") {
            app.resizeObserver = new globalScope.ResizeObserver(() => app.renderer.syncSize());
            app.resizeObserver.observe(app.canvas);
        } else {
            globalScope.addEventListener("resize", () => app.renderer.syncSize());
        }
    }

    function collectElements(documentScope) {
        const ids = [
            "yearStart", "yearEnd", "yearStartValue", "yearEndValue", "decadePresets", "layerControls",
            "showWeakEdges", "rankingMetric", "resetViewButton", "resetSettingsButton", "removeMersenneButton",
            "removeSelectedButton", "clearRemovalButton", "nodeCount", "edgeCount", "letterCount", "componentCount",
            "drawnEdgeCount", "graphTitle", "graphStatus", "graphLegend", "yearHistogram", "removalComparison",
            "personSearch", "personList", "personListCount", "rankingList", "rankingLabel", "detailPanel", "detailKind",
            "datasetSummary", "auditSummary",
            "helpButton", "helpDialog",
        ];
        return Object.fromEntries(ids.map((id) => [id, documentScope.getElementById(id)]));
    }

    globalScope.NaturalPhilosophyNetworkApp = NaturalPhilosophyNetworkApp;
    globalScope.bindNaturalPhilosophyNetworkEvents = bindNetworkEvents;

    if (typeof document !== "undefined") {
        document.addEventListener("DOMContentLoaded", () => {
            const canvas = document.getElementById("networkCanvas");
            const dataset = globalScope.NaturalPhilosophyNetworkData;
            if (!canvas || !dataset) {
                const status = document.getElementById("graphStatus");
                if (status) status.textContent = "データまたはCanvasを読み込めませんでした。";
                return;
            }
            const app = new NaturalPhilosophyNetworkApp(canvas, collectElements(document), dataset);
            bindNetworkEvents(app);
            app.init();
            globalScope.naturalPhilosophyNetworkApp = app;
        });
    }
}(typeof globalThis !== "undefined" ? globalThis : window));
