from pathlib import Path
import re,json,hashlib,collections
p=Path('artifacts/pinball/upper-lane-joint-full-e283fc7');tap=(p/'full.tap').read_text();sections=re.split(r'(?=^# Subtest:)',tap,flags=re.M)
notes={
1:('layout_contract','Standalone cabinet fixture sets only centerZ, not new centerX+.21, then asserts old ±2.73 edges. The .21 discrepancy is consistent with omitted new placement; does not independently certify installed geometry.'),
2:('layout_contract','Same standalone cabinet fixture omits centerX+.21; ray/mesh comparison fails by .21. Real installed ray agreement must be checked separately.'),
4:('layout_contract','Explicit old fastener positions/topology expected; widened board places old -2.66 mount at -3.35.'),
5:('layout_contract','Historical absolute incoming x-2.58 does not reach moved left fasteners; no touch. Does not qualify the new outer route.'),
6:('layout_contract','Test treats shooterOuterRailContact as one collider; prototype exposes an array. TypeError prevents the intended contact check.'),
34:('layout_contract','New stable-only test seeks mesh name shooter-roof-capsule-stock, three old axes and576tri. Candidate uses shared-upper-roof-stock with24capsules. Failure occurs at mesh-name lookup, not a measured500k budget exceedance.'),
36:('functional_gameplay','Saved ball fires and passes vz<-10 assertion, but does not reach upfield before drain. This is stronger than local charge1/fires1/drain evidence and remains an unmet functionality gate.'),
39:('layout_contract','Hard-coded x1.60/z2.65 crossing is no longer new inlane sensor location. Missing award here does not test the moved lane switch, which needs its own semantic crossing coverage.'),
44:('layout_contract','Test computes legacy LOWER_LAYOUT.laneInserts against new rails, whereas installed prototype uses cLaneLabel. Literal label/rail assertion fails; installed print/reference approval is not established by this classification.'),
46:('visible_direction','Actual laneInsert canvas direction remains upstream for OUT. Prototype source does not contain stable0b75 arrow correction. A visible-direction regression, not a scoring or budget issue.'),
48:('visible_direction','Same inherited OUT canvas arrow direction failure on the right.'),
56:('geometry_margin','Current pivot-derived root-to-center nominal ray fails existing sling envelope margin. Not a universal actual-shot blockage proof; required corridor margin is unmet.'),
58:('mixed_route_contract','Old legal x±2.12/z2.6 fixture fails drain with held flippers. Channel meaning changed in widened lanes; cannot call it new true OUT or dismiss the observed playing outcome. New semantic OUT proof is separate.'),
60:('mixed_route_contract','Historical IN/OUT mouth coordinates fail expected OUT drain. Absolute locations and channel identities changed; observed outcome retained and new corresponding mouth behavior must be qualified.'),
61:('layout_contract','New right OUT starts at shared shooter fork Z2.45 while divider starts1.35, contradicting old array-order entrance assumption. Does not establish or refute full actual entrance clearance.'),
62:('layout_contract','Old wire-drop point -1.55/.575/2.70 is no longer inside relocated tail, so its historic-invalid assertion no longer holds.'),
64:('functional_gameplay','Five natural capture/release/ramp/wire/refire sequence fails first required ramp traversal0 vs1. Existing operation/result gate is unmet; different future timings are untested, not automatically equivalent.'),
67:('layout_contract','Actual wire-end approach reaches test quiet phase, but asserts old pivot-.195 cradle X. Longer bat receiver location differs; location contract fails and full new capture/refire quality remains to qualify.'),
68:('layout_contract','Fixed old left boundary point no longer has the specified legal-edge status.'),
69:('layout_contract','Explicit start legality assertion rejects old IN x1.72/z2.8. This case never executes its dynamic route.'),
75:('layout_contract','Right support assertion only accepts X2.305..2.395; shared new posts areX2.75. Ground beam height and whole installed clearance need separate proof.'),
84:('layout_contract','Support search requires exact old leftX-2.65/rearZ-5.70; empty station list aborts before80 approaches.'),
91:('functional_gameplay','The65%-length fixture derives from the shared1.65 profile, not a mismatched legacy profile. It records no coil-driven drive while final contact velocity is upfield. The required physical-drive/coil contract fails; exact cause and initial all-solid legality were not recorded, so do not infer all flippers cannot drive.'),
96:('mixed_route_contract','Old side-wall absolute approaches reach a flipper (2 contacts) instead of expected OUT0. Repositioned side region/channel identity is material; distinct IN/OUT behavior still requires semantic qualification.'),
97:('functional_gameplay','Real natural31-power progression fails minimum duration with2.7seconds (<3). No fixture-relocation explanation can turn this into a pass; remaining duration/reactive comparisons stop at this assertion.'),
106:('functional_gameplay','Fixed20 central incoming-ball distribution has only4 physical contacts vsrequired16. This is a difficulty/capture-coverage regression under the existing distribution, not proof every aim input is narrower.'),
108:('functional_gameplay','After captured release, side-1 delay.5 produces no required upfield crossing. Existing two-timing distinction gate is unmet; normalized timing may differ but was not substituted.'),
109:('geometry_margin','Computed sling/rail conservative passage margin .257024 falls below required .320. Uses existing .07 envelope subtraction; not by itself proof actual sphere is physically pinched.'),
111:('functional_gameplay','Natural release80 records real coil shot but crest/return/floor flags allfalse. Same-ball ramp→wire→capture/refire is not qualified.'),
137:('layout_contract','Uses old RAMP_POINTS terminal as completion region though sampleRamp now has new wire endpoint. Raw world steps later fall belowY-.5 without reaching old target; new endpoint traversal must be examined separately, not counted as a pass.'),
138:('layout_contract','Actual rampTraversals becomes nonzero, then old RAMP_POINTS exit X/Z assertion fails. Terminal-datum contract is inconsistent with new tail; exact new award placement still needs verification.'),
141:('functional_gameplay','Natural adjacent flipper timing80 does not complete actual rampTraversal. Not merely the old geometric endpoint assertion.'),
142:('layout_contract','Measured mouth approach tests completion at old RAMP_POINTS exit; new tail differs. Escaped-before-old-target failure remains, not evidence of completed new traversal.'),
148:('layout_contract','Ink test expects scale1024/5.50, candidate uses1024/6.88. Explicit board width registration contract differs.'),
162:('layout_contract','Old exact8-gon outer rail vertices/flatcaps expected; candidate has relocated capsule stock. Topology contract changed, not500k exceedance.'),
163:('layout_contract','Single outer collider API expected but array supplied; TypeError prevents old octagon ray comparison.'),
164:('layout_contract','Absolute old exterior approaches do not hit newly relocated rail. New route contacts need independent corresponding fixtures.'),
170:('layout_contract','Earlier return phase/ball assertions pass; terminal oldX2.45..2.70 check fails with new shooterX2.93.'),
171:('layout_contract','Same old absolute shooter return X interval mismatch for lateral-1.'),
172:('layout_contract','Same old absolute shooter return X interval mismatch for lateral+1.'),
173:('layout_contract','Same old absolute shooter return X interval mismatch for lateral+3.'),
194:('layout_contract','Sensor floorY.04/topY.36 checks precede and pass; C sensorZ-4.45 fails old allZ-4.55 assertion. High-route false-award behavior is not established by vertical bounds alone.'),
196:('functional_gameplay','First natural elevated release80 has rampTraversals0; no-award assertions for completed traversal are not reached. Cannot claim five elevated no-false-award routes passed.'),
203:('layout_contract','Actual sampleRamp tail no longer equals legacy RAMP_POINTS final datum; explicit endpoint contract fails.'),
206:('geometry_margin','Wire/full-sling projected lateral clearance .001319677 fails .025 requirement. Earlier vertical envelope assertions passed. This is inadequate lateral reserve, not demonstrated3D penetration.')}
fail=[];passes=[]
for section in sections:
 m=re.search(r'^(not ok|ok) (\d+) - (.+)$',section,re.M)
 if not m:continue
 status,num,name=m.groups();num=int(num)
 if status=='ok':passes.append({'number':num,'name':name});continue
 loc=re.search(r"location: '([^']+)'",section);category,note=notes[num]
 fail.append({'number':num,'name':name,'category':category,'interpretation':note,'location':loc.group(1) if loc else None,'verbatimTAP':section.rstrip()})
assert len(fail)==45 and len(passes)==162 and set(notes)=={x['number'] for x in fail}
result=json.loads((p/'result.json').read_text());inv=json.loads((p/'invocation.json').read_text());counts=dict(collections.Counter(x['category'] for x in fail))
report={'status':'FAILED','total':207,'passed':162,'failed':45,'cancelled':0,'skipped':0,'countsAreNotAdjustedByClassification':True,'classificationCounts':counts,'sourceSha256':result['sourceSha256'],'testFileCount':37,'testFilesUnchanged':result['testFilesUnchanged'],'headAtStart':inv['head'],'headAtEnd':result['headAfter'],'newTest':'installed shooter roof uses three closed capsule stocks on the existing physical axes','newTestFileSha256':inv['testFilesBefore']['web/js/pinball/geometry-budget.test.mjs']['sha256'],'failures':fail,'passedTests':passes,'lint':'Not run. Equivalent existing test:pinball pipeline stops before eslint when the node test phase fails. No lint pass claimed.','causality':'One whole-candidate run against unchanged current tests. No 5891 full-suite rerun; cannot attribute inherited lower/longbat failures specifically to new upper-bar change.','limitations':['Classification does not convert any failure into a pass','Natural six-power local pass is narrower than this full corpus','No new simulations, changed fixtures or expectations used to classify failures','Concurrent stable run means duration is not a performance benchmark']}
(p/'classification.json').write_text(json.dumps(report,indent=2)+'\n')
(p/'README.md').write_text('''# d971: full unchanged pinball regression

**FAILED:207 tests,162 pass,45 fail,0 skipped/cancelled.** Classification does not change these counts or qualify adoption. The run used all37 current pinball test files and only the frozen d971 loader. No source/test/fixture/expectation edits or successful-case substitutions were made.

- Start HEAD:e283fc7439c6d8d1395247462bd357987efb54d1. End HEAD:79d7b91a8a71f6c010722ab65a6200459253c902 (separate stable roof preservation).
- Source:d971a4257f41512487cdf88ac9bfd9fc3f5208fd1223bf7e052a13edade98fac, unchanged throughout.
- All37 test files hash-identical before/after. geometry-budget.test.mjs SHA:d6f6393e76c428606e6e502cec15ffd3cd735449ef9f9463398bc009308be6be.
- Inventory includes the newly added207th stable-only closed-roof test. It expects a3-stock stable mesh name/axes; candidate has24stocks under a different name. This failure is not a measured render-budget exceedance.
- full.tap SHA:cf0456bb5c20c3932af930fd51da0e1859f5010f49ed3b678e96c0c7206db1d7. Duration118.59seconds, with separate stable work potentially concurrent; not a benchmark.

## What failed

classification.json retains every failing assertion/stack, its source location and a specific interpretation. Group totals are28 changed/inconsistent layout, representation or API contracts;3 mixed old-route/behavior contracts;9 observed functional gates;3 geometric-margin gates;2 visible-direction gates. Every one remains a FAIL.

Clear contract differences include omitted cabinet centerX+.21 in standalone fixtures, old mount coordinates, singular vsarray outer-rail API, old shooter X2.45..2.70, old RAMP_POINTS endpoint versus relocated actual wire tail, C sensorZ−4.45 versus old−4.55, and old rendering vertex/count assumptions. These require new meaningful contracts and installed verification, not blindly changing expected numbers. Several old fixed OUT coordinates no longer represent the same channel; their playing/flipper-contact results are retained separately rather than labeled safe OUT passes.

Meaningful whole-candidate deficits include:
- Earned side-save passes firing/vz<−10, then fails actual upfield return. The local fired-once-and-drained observation does not meet this stronger existing requirement.
- Natural31-power progression includes2.7second play, violating the existing minimum3seconds. Later duration/reactive assertions were not reached.
- Central20-ball distribution produces4 physical contacts versus required16, showing a capture/difficulty change for that distribution.
- Existing release timing and natural ramp→wire→capture/refire sequences fail. Release80 has rampTraversals0; the five elevated no-false-award route test therefore aborts before proving its no-award claims.
- Nominal root shot corridor and conservative sling/inlane margin fail. The latter is.257024 versusrequired.320, not by itself proof of actual sphere pinching.
- Projected wire/full-sling lateral reserve is.001319677 versusrequired.025; earlier vertical checks pass. Do not turn that projected failure into an unsupported claim of3D penetration.
- Both OUT canvas arrows still point upstream in this884-derived prototype. Stable0b75 correction is not part of its source. No rendering-only correction was mixed into this freeze.

## Scope and remaining checks

This is the complete existing pinball Node test corpus, not all games in npm test. The equivalent test:pinball pipeline stops before eslint on this unit-test failure, so lint was not run or claimed passed. Some broad natural-launch/session tests do pass; all162 names are saved, but no local success overrides the45 failures.

This run cannot isolate which deficits are inherited from whole-long-lane/5891 versus introduced by d971; no duplicate full5891 run was requested. Six-power/weak local success is valuable but narrower. Dense continuous aiming, full natural54 and adoption are not certified by this report. Existing high-route false-award coverage remains incomplete until actual traversals succeed.

invocation.json records exact command, before-hashes and the new stable test diff; result.json records after-hashes and exit1. No temporary build tree was generated. Only these persistent result artifacts were written; production and frozen sources were not edited.
''')
manifest={str(f.relative_to(p)):{'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in p.iterdir() if f.is_file() and f.name!='manifest.json'};(p/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps({'result':'162/207,45FAIL','categories':counts}))
