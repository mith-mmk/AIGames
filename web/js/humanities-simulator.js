(function initializeHumanitiesSimulator(globalScope) {
    "use strict";

    const DEFAULT_SUBJECT = "猫が机からコップを落とした";
    const EXTREME_LABELS = ["通常", "かなりそれっぽい", "学派の caricature", "何を論じていたのか分からない"];
    const PARAMETER_DEFINITIONS = Object.freeze([
        { key: "primarySources", label: "一次資料の量", short: "一次資料" },
        { key: "theoryDependence", label: "理論依存度", short: "理論依存度" },
        { key: "politicality", label: "政治性", short: "政治性" },
        { key: "falsifiability", label: "反証可能性", short: "反証可能性" },
        { key: "properNounDensity", label: "固有名詞密度", short: "固有名詞密度" },
        { key: "citationCount", label: "引用数", short: "引用数" },
        { key: "assertiveness", label: "断定口調", short: "断定口調" },
        { key: "conceptDensity", label: "概念語密度", short: "概念語密度" },
        { key: "originality", label: "独自主張の強さ", short: "独自主張" },
    ]);

    const METRIC_DEFINITIONS = Object.freeze([
        { key: "explanatoryPower", label: "説明力" },
        { key: "refutationResistance", label: "反証耐性" },
        { key: "sourceGrounding", label: "史料接地率" },
        { key: "conceptInflation", label: "概念膨張率" },
        { key: "circularReasoning", label: "循環論法指数" },
        { key: "politicalStatement", label: "政治声明化率" },
        { key: "soundsMeaningful", label: "何か言っているように見える度" },
    ]);

    const SCHOOLS = Object.freeze({
        empirical: {
            label: "実証史学",
            description: "目撃証言、時刻、物理的状況を確認し、まず何が起きたのかを確定しようとする。",
            parameters: { primarySources: 85, theoryDependence: 20, politicality: 20, falsifiability: 90, properNounDensity: 75, citationCount: 55, assertiveness: 45, conceptDensity: 25, originality: 60 },
            concepts: ["史料批判", "因果関係", "事実確認", "状況証拠", "出来事の特定"],
            criticalTerms: ["家父長制を示す制度史料", "新自由主義改革の政策文書", "自己言及的な理論的旋回"],
            evidence: ["目撃証言", "室内カメラの映像", "床面に残った水滴", "当日の記録", "コップの破損状況"],
            names: ["佐藤による現場記録", "『家庭内事故年報』", "市立生活史資料館", "午後三時十七分の観察票"],
            citations: ["記録者Aが報告するように", "先行する事故史研究も示すように", "証言集の記載によれば"],
            patterns: ["まず、観察可能な事実を区別しなければならない。", "この仮説は、映像と証言の照合によって検証できる。", "確認できない推測を結論へ持ち込むべきではない。"],
            extreme: ["それでも史料の欠落自体を史料として記録する", "脚注が本文をほとんど覆い尽くす"],
        },
        marxist: {
            label: "マルクス主義史学",
            description: "小さな出来事を所有関係、生産関係、階級構造、労働の配置へ接続する。",
            parameters: { primarySources: 50, theoryDependence: 80, politicality: 90, falsifiability: 30, properNounDensity: 45, citationCount: 70, assertiveness: 70, conceptDensity: 75, originality: 65 },
            concepts: ["生産関係", "所有構造", "階級配置", "労働の再生産", "商品形態", "剰余価値"],
            criticalTerms: ["家父長制的分業", "ケア労働の不可視化", "新自由主義的市場化", "自己責任化の言説"],
            evidence: ["誰が机を所有しているか", "片付けを担う労働", "コップの購入記録", "家事分担の聞き取り", "空間の利用規則"],
            names: ["マルクスの疎外論", "家庭内労働研究会", "『日常生活の政治経済学』", "第三次家事時間調査"],
            citations: ["マルクスがすでに示したように", "先行研究の蓄積は指摘している", "この点は労働史研究でも反復されてきた"],
            patterns: ["問題は、誰がその配置から利益を得るかである。", "偶然に見える動作も、所有と労働の構造から切り離せない。", "個人の行為へ還元することは、構造を不可視化する。"],
            extreme: ["出来事を階級関係の縮図として宣言する", "物の配置にまで所有関係を読み込む"],
        },
        poststructuralist: {
            label: "ポスト構造主義",
            description: "「落下」「事故」「所有物」といった概念が、どの言説秩序で構成されたかを問う。",
            parameters: { primarySources: 25, theoryDependence: 90, politicality: 70, falsifiability: 15, properNounDensity: 35, citationCount: 75, assertiveness: 65, conceptDensity: 90, originality: 55 },
            concepts: ["言説", "表象", "他者化", "構築", "まなざし", "差延", "主体化"],
            criticalTerms: ["家父長制的言説", "新自由主義的統治性", "主体化の技法", "自己言及的な理論的旋回"],
            evidence: ["「落とした」という動詞の選択", "事故として分類する記録", "所有物と呼ばれる境界", "正常な机の配置", "語り直しの反復"],
            names: ["フーコー的な権力の配置", "『日常言説の考古学』", "匿名の観察者", "分類語彙のアーカイブ"],
            citations: ["フーコー以後の議論が示すように", "既存の言説分析も指摘している", "この問題についてはすでに反復的な議論がある"],
            patterns: ["ここで問われるのは、何が起きたかだけではない。", "その出来事を出来事として成立させる語彙が先にある。", "反証を求める身振りそのものも、言説の効果として読める。"],
            extreme: ["主体の安定性まで解体する", "出来事を語れないことの語りとして再配置する"],
        },
        psychoanalytic: {
            label: "精神分析",
            description: "猫、机、コップを欲望、欠如、象徴秩序、主体の無意識へ接続する。",
            parameters: { primarySources: 30, theoryDependence: 75, politicality: 55, falsifiability: 20, properNounDensity: 30, citationCount: 50, assertiveness: 60, conceptDensity: 80, originality: 60 },
            concepts: ["欲望", "欠如", "象徴秩序", "投影", "抑圧", "無意識", "主体"],
            criticalTerms: ["家父長制的象徴秩序", "新自由主義的自己責任化", "欲望の自己言及的な迂回"],
            evidence: ["落下を目撃したときの沈黙", "割れた器への過剰な反応", "猫への視線", "所有者の語りの揺れ", "反復される夢の比喩"],
            names: ["フロイト的な置換", "ラカンの象徴界", "『家庭内欲望の症例集』", "匿名患者の語り"],
            citations: ["フロイトが示唆したように", "ラカン派の議論によれば", "臨床的な先行研究も指摘している"],
            patterns: ["この動作は、単なる動作として完結していない。", "失われたものをめぐる欲望が、対象の配置に現れている。", "否定や偶然という説明は、むしろ抑圧の形式かもしれない。"],
            extreme: ["対象を母性的な代替物として読む", "沈黙を無意識の証言にする"],
        },
        cultural: {
            label: "カルチュラル・スタディーズ",
            description: "日常実践、文化的意味付け、権力、メディア、主体形成へ出来事を広げる。",
            parameters: { primarySources: 45, theoryDependence: 70, politicality: 75, falsifiability: 25, properNounDensity: 55, citationCount: 65, assertiveness: 60, conceptDensity: 75, originality: 65 },
            concepts: ["日常実践", "文化的意味", "主体形成", "表象政治", "ヘゲモニー", "アイデンティティ"],
            criticalTerms: ["家父長制的規範", "ケアの政治", "新自由主義的主体", "日常実践の再編"],
            evidence: ["家族内で共有された語り", "SNSで拡散される動画", "片付けをめぐる会話", "食卓のマナー", "「普通の家庭」という表現"],
            names: ["バーミンガム学派の文化分析", "『日常メディア白書』", "地域コミュニティの聞き取り", "視聴者研究アーカイブ"],
            citations: ["ホールの議論を踏まえれば", "文化研究の蓄積が示してきたように", "メディア研究者も繰り返し指摘している"],
            patterns: ["この小さな実践は、日常を自然化する仕組みを可視化する。", "意味は対象に内在するのではなく、共有される実践の中で交渉される。", "誰が笑い、誰が片付けるのかという差異を見落とせない。"],
            extreme: ["画像を文化闘争のメディアとして読む", "視線を主体形成の抵抗として配信する"],
        },
        cognitive: {
            label: "認知科学に侵食された人文学",
            description: "注意、知覚、認知バイアス、因果推論、行動モデルで説明し、人文学的概念を切り捨てがち。",
            parameters: { primarySources: 65, theoryDependence: 45, politicality: 35, falsifiability: 70, properNounDensity: 65, citationCount: 50, assertiveness: 55, conceptDensity: 45, originality: 70 },
            concepts: ["注意資源", "認知バイアス", "因果推論", "行動モデル", "知覚閾値", "予測誤差"],
            criticalTerms: ["家父長制批判の認知フレーム", "新自由主義的自己責任バイアス", "理論的旋回の認知コスト"],
            evidence: ["視線の移動時間", "落下前後の反応時間", "観察者の再認課題", "物理的な重心", "行動選択の頻度"],
            names: ["実験条件A", "『日常行動データセット』", "反応時間研究グループ", "ベイズ的因果モデル"],
            citations: ["認知心理学の実験が示すように", "行動科学の知見によれば", "モデル比較の結果も支持している"],
            patterns: ["この事例は、注意と予測誤差の組み合わせで説明できる。", "象徴や権力を持ち出す前に、観察可能な行動を定義する必要がある。", "意味の問題は、十分なデータが集まればモデルに置換できる。"],
            extreme: ["対象を予測誤差を出力する装置として扱う", "人文学的な問いを有意差の脚注に追いやる"],
        },
    });

    function clamp(value, minimum = 0, maximum = 100) {
        return Math.max(minimum, Math.min(maximum, Number(value) || 0));
    }

    function round(value) {
        return Math.round(clamp(value));
    }

    function copyParameters(parameters) {
        return PARAMETER_DEFINITIONS.reduce((copy, definition) => {
            copy[definition.key] = clamp(parameters[definition.key]);
            return copy;
        }, {});
    }

    function pick(random, values) {
        return values[Math.floor(random() * values.length) % values.length];
    }

    function cleanSubject(subject) {
        const cleaned = String(subject || "").replace(/\s+/g, " ").trim();
        return cleaned || DEFAULT_SUBJECT;
    }

    function joinJapanese(values) {
        if (values.length <= 1) return values[0] || "";
        if (values.length === 2) return `${values[0]}と${values[1]}`;
        return `${values.slice(0, -1).join("、")}、そして${values[values.length - 1]}`;
    }

    class HumanitiesSimulatorCore {
        constructor(options = {}) {
            this.random = typeof options.random === "function" ? options.random : Math.random;
            this.init();
        }

        init() {
            this.subject = DEFAULT_SUBJECT;
            this.schoolId = "empirical";
            this.secondarySchoolId = "poststructuralist";
            this.mixEnabled = false;
            this.mixRatio = 70;
            this.extremeLevel = 0;
            this.parameters = copyParameters(SCHOOLS[this.schoolId].parameters);
            this.result = this.generate();
            return this.result;
        }

        setSchool(schoolId) {
            if (!SCHOOLS[schoolId]) return false;
            this.schoolId = schoolId;
            if (this.secondarySchoolId === schoolId) this.secondarySchoolId = Object.keys(SCHOOLS).find((id) => id !== schoolId);
            this.parameters = copyParameters(SCHOOLS[schoolId].parameters);
            this.extremeLevel = 0;
            return true;
        }

        setSecondarySchool(schoolId) {
            if (!SCHOOLS[schoolId]) return false;
            this.secondarySchoolId = schoolId === this.schoolId
                ? Object.keys(SCHOOLS).find((id) => id !== schoolId)
                : schoolId;
            return true;
        }

        setParameter(key, value) {
            if (!PARAMETER_DEFINITIONS.some((definition) => definition.key === key)) return false;
            this.parameters[key] = clamp(value);
            return true;
        }

        setMix(enabled, ratio = this.mixRatio) {
            this.mixEnabled = Boolean(enabled);
            this.mixRatio = clamp(ratio);
        }

        getEffectiveParameters() {
            const primary = this.parameters;
            let effective = copyParameters(primary);
            if (this.mixEnabled && this.schoolId !== this.secondarySchoolId) {
                const secondary = SCHOOLS[this.secondarySchoolId].parameters;
                const primaryWeight = this.mixRatio / 100;
                effective = PARAMETER_DEFINITIONS.reduce((values, definition) => {
                    const key = definition.key;
                    values[key] = round(primary[key] * primaryWeight + secondary[key] * (1 - primaryWeight));
                    return values;
                }, {});
            }

            // 極端化は固定文を足すのではなく、現在のスライダー値を中立点から段階的に遠ざける。
            const exaggeration = [0, 0.18, 0.36, 0.58][this.extremeLevel];
            if (!exaggeration) return effective;
            return PARAMETER_DEFINITIONS.reduce((values, definition) => {
                const key = definition.key;
                values[key] = round(effective[key] + (effective[key] - 50) * exaggeration);
                return values;
            }, {});
        }

        getActiveSchools() {
            return {
                primary: SCHOOLS[this.schoolId],
                secondary: this.mixEnabled ? SCHOOLS[this.secondarySchoolId] : null,
            };
        }

        extreme() {
            this.extremeLevel = Math.min(3, this.extremeLevel + 1);
            return this.generate();
        }

        resetExtreme() {
            this.extremeLevel = 0;
            return this.generate();
        }

        generate(subject = this.subject) {
            this.subject = cleanSubject(subject);
            const parameters = this.getEffectiveParameters();
            const schools = this.getActiveSchools();
            const relay = this.createRelay(parameters, schools);
            const metrics = this.calculateMetrics(parameters);
            const analysis = this.createAnalysis(parameters, metrics, schools);
            this.result = {
                subject: this.subject,
                schoolId: this.schoolId,
                schoolLabel: schools.primary.label,
                secondarySchoolLabel: schools.secondary ? schools.secondary.label : "",
                mixEnabled: this.mixEnabled,
                mixRatio: this.mixRatio,
                extremeLevel: this.extremeLevel,
                extremeLabel: EXTREME_LABELS[this.extremeLevel],
                parameters: copyParameters(parameters),
                relay,
                essay: relay[3].text,
                metrics,
                analysis,
            };
            return this.result;
        }

        selectConcepts(schools, parameters, count = 3) {
            const primary = schools.primary.concepts;
            const secondary = schools.secondary ? schools.secondary.concepts : [];
            const values = [];
            const primaryCritical = schools.primary.criticalTerms || [];
            const secondaryCritical = schools.secondary ? (schools.secondary.criticalTerms || []) : [];
            if (primary.length) values.push(pick(this.random, primary));
            if (parameters.politicality > 55 || parameters.theoryDependence > 65) {
                if (primaryCritical.length) values.push(pick(this.random, primaryCritical));
                if (secondaryCritical.length && this.mixRatio < 50) values.push(pick(this.random, secondaryCritical));
            }
            if (secondary.length && this.mixRatio < 100 && this.mixRatio > 0) values.push(pick(this.random, secondary));
            while (values.length < count) {
                const source = schools.secondary && this.random() > this.mixRatio / 100 ? secondary : primary;
                values.push(pick(this.random, source.length ? source : primary));
            }
            return [...new Set(values)].slice(0, count);
        }

        selectSchoolPattern(schools) {
            if (!schools.secondary || this.random() < this.mixRatio / 100) return pick(this.random, schools.primary.patterns);
            return pick(this.random, schools.secondary.patterns);
        }

        selectSchoolValue(schools, key) {
            const school = schools.secondary && this.random() >= this.mixRatio / 100
                ? schools.secondary
                : schools.primary;
            return pick(this.random, school[key]);
        }

        getCriticalFrames(schools) {
            const criticalPool = [...(schools.primary.criticalTerms || []), ...(schools.secondary ? schools.secondary.criticalTerms || [] : [])];
            return [...new Set(criticalPool.filter((term) => /家父長制|新自由主義|自己責任|自己言及|理論的旋回/.test(term)))].slice(0, 3);
        }

        createExtremeEssay(parameters, schools, concepts, evidence, name, citation, baseParagraphs) {
            const signatures = [pick(this.random, schools.primary.extreme)];
            if (schools.secondary) signatures.push(pick(this.random, schools.secondary.extreme));
            const signature = joinJapanese(signatures);
            const frames = this.getCriticalFrames(schools);
            const frameText = frames.length ? joinJapanese(frames) : joinJapanese(concepts);
            const level = this.extremeLevel;
            if (level === 1) {
                return [...baseParagraphs, `この読みをもう一段押し進めるなら、${signature}。それでも「${this.subject}」は議論の中心に残り、${frameText}との接点として読み替えられる。`];
            }
            if (level === 2) {
                return [
                    baseParagraphs[0],
                    `「${this.subject}」を単独の出来事として保存すること自体が、${frameText}を隠す操作として疑われる。`,
                    `誰が${evidence}を証拠と呼び、誰が${name}の読者になるのか。その配置は${joinJapanese(concepts)}によって再配線される。`,
                    `${citation}、${this.selectSchoolPattern(schools)} 引用は根拠であると同時に、次の解釈を呼び込む伝言の中継点となる。`,
                    `${signature}。元の対象へ戻る道は残るが、その戻り方まで${joinJapanese(concepts.slice(0, 2))}の問題として記述される。`,
                ];
            }
            return [
                `「${this.subject}」という報告は、いまや${frameText}を作動させる小さな注記としてのみ残る。${signature}。`,
                `資料、主体、権力、欲望、モデルは互いを説明し続け、${evidence}は${name}を参照し、${name}は${citation}へ送り返される。`,
                `この循環を止める反証さえ、${joinJapanese(concepts)}の新たな徴候として回収される。対象は後景へ退き、説明の枠組みが説明の枠組み自身を論じ始める。`,
                `それでも論説は結論する。「${this.subject}」とは対象ではなく、対象を対象化し続ける${joinJapanese(concepts)}の運動であった、と。`,
            ];
        }

        createRelay(parameters, schools) {
            const concepts = this.selectConcepts(schools, parameters, parameters.conceptDensity > 65 ? 4 : 2);
            const evidence = this.selectSchoolValue(schools, "evidence");
            const name = this.selectSchoolValue(schools, "names");
            const citation = this.selectSchoolValue(schools, "citations");
            const assertive = parameters.assertiveness > 60 ? "であることは明らかである" : parameters.assertiveness > 30 ? "と考えられる" : "可能性がある";
            const sourceText = parameters.primarySources > 55
                ? `確認できる範囲では、${this.subject}。手がかりは${evidence}、${name}、および現場の物理的状況である。`
                : `出発点は「${this.subject}」という短い報告だけであり、目撃者や時刻は確定していない。`;
            const listeningText = parameters.properNounDensity > 55
                ? `${name}を参照しつつ、${this.subject}を${joinJapanese(concepts.slice(0, 2))}の問題として聞き取る。`
                : `${this.subject}は、${joinJapanese(concepts.slice(0, 2))}をめぐる語りとして聞き取られる。`;
            const pattern = this.selectSchoolPattern(schools);
            const theoryText = this.extremeLevel === 0
                ? `${pattern} ここで増幅される語彙は、${joinJapanese(concepts)}である。`
                : this.extremeLevel === 1
                    ? `${pattern} この読みを強めると、${joinJapanese(concepts)}が出来事の細部へ入り込む。`
                    : this.extremeLevel === 2
                        ? `${pattern} 伝言が渡るたび、${joinJapanese(concepts)}が証拠と主体の配置まで組み替える。`
                        : `${pattern} ${joinJapanese(concepts)}は互いを参照し、対象よりも理論の運動そのものを前景化する。`;

            const paragraphs = [];
            paragraphs.push(`対象となるのは「${this.subject}」という一見些細な出来事である。${theoryText} ${assertive}。`);
            if (parameters.primarySources > 20) {
                paragraphs.push(parameters.primarySources > 55
                    ? `${sourceText} ${parameters.falsifiability > 55 ? "映像、証言、時刻を照合すれば、仮説の成否を判定できる。" : "ただし、どの証拠も別の読みを排除するとは限らない。"}`
                    : `一次資料が少ないこと自体が、${joinJapanese(concepts.slice(0, 2))}をめぐる沈黙を示している。${sourceText}`);
            }
            if (parameters.citationCount > 25) {
                const citationLines = Math.max(1, Math.min(3, Math.floor(parameters.citationCount / 28)));
                for (let index = 0; index < citationLines; index += 1) {
                    paragraphs.push(`${citation}、${this.selectSchoolPattern(schools)} しかし、この先行研究の位置づけは${parameters.originality > 55 ? "踏み台として再配置される" : "慎重に反復される"}必要がある。`);
                }
            }
            if (parameters.politicality > 35) {
                paragraphs.push(`さらに、${this.subject}を個人の偶然へ閉じることはできない。${joinJapanese(["権力関係", "所有", "周縁化", ...concepts.slice(0, 2)])}が、誰の説明を正当なものにするかを決めている。`);
            }
            if (parameters.politicality > 60 && parameters.theoryDependence > 50) {
                const criticalFrames = this.getCriticalFrames(schools);
                if (criticalFrames.length) paragraphs.push(`この出来事は、${joinJapanese(criticalFrames)}という批判フレームへ再配置される。ここで対象を説明することは、対象を別の理論的屈折へ送り返すことでもある。`);
            }
            if (parameters.falsifiability < 45) {
                paragraphs.push(`反証が提出されたとしても、それは${joinJapanese(concepts.slice(0, 2))}が別の形で作動した証拠として読める。したがって、議論はそのつど自己を維持する。`);
            } else {
                paragraphs.push(`この解釈は、${parameters.properNounDensity > 50 ? "追加の証言、記録、再現実験" : "観察可能な条件"}によって修正されうる。${assertive}。`);
            }
            if (parameters.originality > 50) {
                paragraphs.push(`本稿の独自の主張は、${this.subject}を${joinJapanese(concepts.slice(0, 2))}の接点として捉え直す点にある。${assertive}。`);
            } else {
                paragraphs.push(`以上は既存の議論を大きく逸脱するものではないが、${joinJapanese(concepts.slice(0, 2))}という観点から再確認する価値はある。`);
            }
            const finalParagraphs = this.extremeLevel > 0
                ? this.createExtremeEssay(parameters, schools, concepts, evidence, name, citation, paragraphs)
                : paragraphs;
            return [
                { title: "原事実", text: `「${this.subject}」` },
                { title: "学派の聞き取り", text: this.extremeLevel > 0 ? `${listeningText} 読みが反復されるにつれ、学派固有の前提がより強く現れる。` : listeningText },
                { title: "理論的拡張", text: theoryText },
                { title: "完成論説", text: finalParagraphs.join("\n\n") },
            ];
        }

        calculateMetrics(parameters) {
            const p = parameters;
            return {
                explanatoryPower: round(p.primarySources * 0.35 + p.falsifiability * 0.2 + p.originality * 0.15 + (100 - p.theoryDependence) * 0.15 + (100 - p.conceptDensity) * 0.1 + p.properNounDensity * 0.05),
                refutationResistance: round((100 - p.falsifiability) * 0.55 + p.theoryDependence * 0.25 + p.assertiveness * 0.15 + p.conceptDensity * 0.05),
                sourceGrounding: round(p.primarySources * 0.65 + p.properNounDensity * 0.2 + p.falsifiability * 0.15),
                conceptInflation: round(p.theoryDependence * 0.45 + p.conceptDensity * 0.25 + p.politicality * 0.15 + (100 - p.primarySources) * 0.15),
                circularReasoning: round((100 - p.falsifiability) * 0.45 + p.theoryDependence * 0.25 + p.assertiveness * 0.2 + (100 - p.originality) * 0.1),
                politicalStatement: round(p.politicality * 0.65 + p.theoryDependence * 0.2 + p.conceptDensity * 0.15),
                soundsMeaningful: round(p.conceptDensity * 0.35 + p.assertiveness * 0.25 + p.citationCount * 0.2 + p.theoryDependence * 0.1 + p.politicality * 0.1),
            };
        }

        createAnalysis(parameters, metrics, schools) {
            const p = parameters;
            const analysis = [];
            if (p.theoryDependence > 60) analysis.push("理論依存度が高いため、抽象概念と学派固有の語彙が増加。");
            if (p.primarySources < 45) analysis.push("一次資料が少ないため、事実記述よりも解釈と沈黙の読解が前景化。");
            if (p.primarySources > 65) analysis.push("一次資料が多いため、日付・証言・物理的状況の確認が増加。");
            if (p.citationCount > 55) analysis.push("引用数が高いため、先行研究参照表現と議論の迂回が増加。");
            if (p.politicality > 60) analysis.push("政治性が高いため、権力関係・所有・周縁化への接続が増加。家父長制的規範や新自由主義的統治性も批判対象になる。");
            if (p.falsifiability < 40) analysis.push("反証可能性が低いため、どの結果も理論内に回収する構造が増加。");
            if (p.assertiveness > 60) analysis.push("断定口調が高いため、結論の確信度と威圧感が増加。");
            if (p.conceptDensity > 65) analysis.push("概念語密度が高いため、単純な出来事の概念膨張率が上昇。");
            if (p.originality < 40) analysis.push("独自主張が弱いため、先行研究の再配置が結論の中心になる。");
            if (this.mixEnabled) analysis.push(`${schools.primary.label}と${schools.secondary.label}の語彙が混在し、論証の不整合も許容。`);
            if (this.extremeLevel > 0) analysis.push(`極端化により、現在の設定値を中立点から遠ざけ、入力対象を保ったまま学派固有の読みを増幅。`);
            analysis.push(`風刺的メーターでは、説明力${metrics.explanatoryPower}に対して「何か言っているように見える度」が${metrics.soundsMeaningful}。`);
            return analysis.slice(0, 7);
        }

        getSnapshot() {
            return {
                subject: this.subject,
                schoolId: this.schoolId,
                secondarySchoolId: this.secondarySchoolId,
                mixEnabled: this.mixEnabled,
                mixRatio: this.mixRatio,
                extremeLevel: this.extremeLevel,
                parameters: copyParameters(this.parameters),
                result: this.result,
            };
        }
    }

    class HumanitiesSimulatorUI {
        constructor(documentScope) {
            this.document = documentScope;
            this.core = new HumanitiesSimulatorCore();
            this.parameterInputs = new Map();
            this.reportNumber = 1;
        }

        init() {
            this.populateSchools();
            this.createParameterControls();
            this.bindEvents();
            this.syncControlsFromCore();
            this.render(this.core.result);
        }

        populateSchools() {
            const options = Object.entries(SCHOOLS).map(([id, school]) => `<option value="${id}">${school.label}</option>`).join("");
            this.document.getElementById("schoolSelect").innerHTML = options;
            this.document.getElementById("secondarySchoolSelect").innerHTML = options;
        }

        createParameterControls() {
            const container = this.document.getElementById("parameterControls");
            PARAMETER_DEFINITIONS.forEach((definition) => {
                const row = this.document.createElement("div");
                row.className = "parameter-row";
                row.innerHTML = `<label for="parameter-${definition.key}">${definition.label}</label><output class="parameter-value" id="value-${definition.key}" for="parameter-${definition.key}">0</output><input id="parameter-${definition.key}" type="range" min="0" max="100" value="0">`;
                container.appendChild(row);
                this.parameterInputs.set(definition.key, row.querySelector("input"));
            });
        }

        bindEvents() {
            const subjectInput = this.document.getElementById("subjectInput");
            const schoolSelect = this.document.getElementById("schoolSelect");
            const secondarySchoolSelect = this.document.getElementById("secondarySchoolSelect");
            const mixToggle = this.document.getElementById("mixToggle");
            const mixRatio = this.document.getElementById("mixRatio");
            this.document.getElementById("generateButton").addEventListener("click", () => this.generateFromControls());
            this.document.getElementById("extremeButton").addEventListener("click", () => {
                this.syncCoreFromControls();
                this.render(this.core.extreme());
                this.syncControlsFromCore();
            });
            this.document.getElementById("resetButton").addEventListener("click", () => {
                this.core.init();
                this.syncControlsFromCore();
                this.render(this.core.result);
            });
            schoolSelect.addEventListener("change", () => {
                const subject = subjectInput.value;
                this.core.setSchool(schoolSelect.value);
                this.syncControlsFromCore();
                subjectInput.value = subject;
                this.render(this.core.generate(subject));
            });
            secondarySchoolSelect.addEventListener("change", () => {
                this.core.setSecondarySchool(secondarySchoolSelect.value);
                this.generateFromControls();
            });
            mixToggle.addEventListener("change", () => {
                this.toggleMixVisibility();
                this.generateFromControls();
            });
            mixRatio.addEventListener("input", () => {
                this.document.getElementById("mixRatioValue").value = `${mixRatio.value}%`;
                this.document.getElementById("mixRatioValue").textContent = `${mixRatio.value}%`;
                this.generateFromControls();
            });
            this.parameterInputs.forEach((input, key) => {
                input.addEventListener("input", () => {
                    this.updateParameterValue(key, input.value);
                    this.generateFromControls();
                });
            });
        }

        updateParameterValue(key, value) {
            const output = this.document.getElementById(`value-${key}`);
            output.value = `${value}`;
            output.textContent = `${value}`;
        }

        toggleMixVisibility() {
            const enabled = this.document.getElementById("mixToggle").checked;
            this.document.getElementById("mixControls").hidden = !enabled;
        }

        syncCoreFromControls() {
            const subject = this.document.getElementById("subjectInput").value;
            this.core.subject = cleanSubject(subject);
            this.parameterInputs.forEach((input, key) => this.core.setParameter(key, input.value));
            this.core.setSecondarySchool(this.document.getElementById("secondarySchoolSelect").value);
            this.core.setMix(this.document.getElementById("mixToggle").checked, this.document.getElementById("mixRatio").value);
        }

        generateFromControls() {
            this.syncCoreFromControls();
            this.render(this.core.generate(this.document.getElementById("subjectInput").value));
        }

        syncControlsFromCore() {
            this.document.getElementById("subjectInput").value = this.core.subject;
            this.document.getElementById("schoolSelect").value = this.core.schoolId;
            this.document.getElementById("secondarySchoolSelect").value = this.core.secondarySchoolId;
            this.document.getElementById("mixToggle").checked = this.core.mixEnabled;
            this.document.getElementById("mixRatio").value = `${this.core.mixRatio}`;
            this.document.getElementById("mixRatioValue").value = `${this.core.mixRatio}%`;
            this.document.getElementById("mixRatioValue").textContent = `${this.core.mixRatio}%`;
            this.document.getElementById("schoolDescription").textContent = SCHOOLS[this.core.schoolId].description;
            this.parameterInputs.forEach((input, key) => {
                input.value = `${this.core.parameters[key]}`;
                this.updateParameterValue(key, this.core.parameters[key]);
            });
            this.toggleMixVisibility();
        }

        render(result) {
            const documentScope = this.document;
            this.reportNumber += 1;
            documentScope.getElementById("reportId").textContent = `#${String(this.reportNumber).padStart(4, "0")}`;
            documentScope.getElementById("resultMeta").textContent = result.mixEnabled
                ? `${result.schoolLabel} ${result.mixRatio}% + ${result.secondarySchoolLabel} ${100 - result.mixRatio}%`
                : result.schoolLabel;
            documentScope.getElementById("essayMode").textContent = result.extremeLabel;
            documentScope.getElementById("schoolDescription").textContent = SCHOOLS[result.schoolId].description;
            documentScope.getElementById("relayStages").innerHTML = result.relay.map((stage, index) => `<article class="relay-stage"><span class="stage-index">STAGE 0${index + 1}</span><h3>${stage.title}</h3><p>${this.escapeHtml(stage.text).replace(/\n/g, "<br>")}</p></article>`).join("");
            documentScope.getElementById("essayOutput").innerHTML = result.essay.split("\n\n").map((paragraph) => `<p>${this.escapeHtml(paragraph)}</p>`).join("");
            documentScope.getElementById("metricsOutput").innerHTML = METRIC_DEFINITIONS.map((definition) => `<div class="metric-row"><span class="metric-label">${definition.label}</span><span class="metric-track"><span class="metric-fill" style="width: ${result.metrics[definition.key]}%"></span></span><span class="metric-value">${result.metrics[definition.key]}</span></div>`).join("");
            documentScope.getElementById("analysisOutput").innerHTML = result.analysis.map((item) => `<li>${this.escapeHtml(item)}</li>`).join("");
            documentScope.getElementById("extremeStatus").textContent = `極端化レベル: ${result.extremeLabel}`;
        }

        escapeHtml(value) {
            return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
        }
    }

    globalScope.HumanitiesSimulatorCore = HumanitiesSimulatorCore;
    globalScope.HUMANITIES_SCHOOLS = SCHOOLS;
    globalScope.HUMANITIES_PARAMETERS = PARAMETER_DEFINITIONS;
    globalScope.HUMANITIES_METRICS = METRIC_DEFINITIONS;

    if (typeof document !== "undefined") {
        document.addEventListener("DOMContentLoaded", () => {
            const app = new HumanitiesSimulatorUI(document);
            app.init();
        });
    }
}(typeof globalThis !== "undefined" ? globalThis : window));
