from pathlib import Path
import json,gzip,hashlib,math
p=Path(__file__).parent
load=lambda n:json.loads((p/n).read_text())
def raw(n):return json.loads(gzip.decompress((p/n).read_bytes()))
def physical(row):return {k:row[k] for k in ['before','after']}
def diff(a,b):
 for x,y in zip(a['rows'],b['rows']):
  if physical(x)!=physical(y):return {'tick':x['tick'],'a':x,'b':y}
 return None if len(a['rows'])==len(b['rows']) else {'lengths':[len(a['rows']),len(b['rows'])]}
def expanded(row,d):
 if row is None:return None
 out=dict(row);out['contacts']=[{**c,'collider':d['descriptors'][c['id']]} if 'id'in c else c for c in row['contacts']];return out
families={f:{m:load(f'{m}-{f}-summary.json') for m in ['stable','v2','stud','sensor','both']} for f in ['upper-lanes','ramp','physics']}
comparison=[]
for f,modes in families.items():
 for ma,mb in [('v2','sensor'),('stud','both')]:
  for ra in modes[ma]['results']:
   rb=next((x for x in modes[mb]['results'] if x['delay']==ra['delay']),None)
   if rb:
    a,b=raw(ra['rawTrace']),raw(rb['rawTrace']);comparison.append({'family':f,'a':ma,'b':mb,'delay':ra['delay'],'stepsA':len(a['rows']),'stepsB':len(b['rows']),'physicalStatesExactlyEqual':diff(a,b) is None})
inresults={m:load(m+'-in-arrival.json') for m in ['stable','v2','stud','sensor','both']}
for ma,mb in [('v2','sensor'),('stud','both')]:
 for ra,rb in zip(inresults[ma]['results'],inresults[mb]['results']):comparison.append({'family':'in-arrival','a':ma,'b':mb,'entry':ra['entry'],'speed':ra['speed'],'physicalStatesExactlyEqual':diff(raw(ra['rawTrace']),raw(rb['rawTrace'])) is None})
a,b=raw('v2-upper-lanes-81.json.gz'),raw('stud-upper-lanes-81.json.gz');first=diff(a,b);first['a']=expanded(first['a'],a);first['b']=expanded(first['b'],b)
selected={}
for m in ['stable','v2','stud','sensor','both']:
 d=raw(f'{m}-upper-lanes-81.json.gz');shots=d['shots'];shot=shots[0];stage=[expanded(row,d) for row in d['rows'] if row['before']['stage']!=row['after']['stage']];mouth=next((expanded(row,d) for row in d['rows'][shot['tick']:] if row['before']['p'][2]>1.1>=row['after']['p'][2]),None);selected[m]={'initialCapture':d['rows'][30]['before'],'cradle':d['rows'][529]['after'],'release':d['rows'][610]['after'],'firstCoil':shot,'mouthPlaneZ1_1':mouth,'stageTransitions':stage,'final':d['rows'][-1]['after']}
long=[]
for speed in [.2,2,4,8]:
 av,bv=raw(f'v2-in-new-in-mouth-{speed}.json.gz'),raw(f'stud-in-new-in-mouth-{speed}.json.gz');firstLong=diff(av,bv);bat={}
 for mode,d in [('v2',av),('stud',bv)]:bat[mode]=next((row for row in d['rows'] if any(c['shape']==9 and abs(c['center']['x']+1.25)<1e-6 and sum(c['impulses'])>1e-7 for c in row['contacts'])),None)
 long.append({'speed':speed,'firstDivergence':firstLong,'firstPositiveLeftBatImpulse':bat})
# .2 is formatted 0.2 in JS file name, handled above by Python formatting.
result={'scope':'Diagnostics only, no new geometry applied. Original predecessors and target assertions execute, but later tests not scheduled. All full snapshots compare p/v/spin/phase/ball/coil/ramp/bat angles; detector award differences intentionally excluded from motion equality.','matchedPairs':comparison,'firstUpper81JointDivergence':first,'upper81SelectedStates':selected,'longINJointDivergence':long,'familyResults':{f:{m:{'worlds':d['worlds'],'tests':d['tests'],'results':d['results']} for m,d in modes.items()} for f,modes in families.items()},'inArrivalResults':{m:{'method':d['method'],'results':[{k:v for k,v in row.items() if k!='trace'} for row in d['results']]} for m,d in inresults.items()},'limits':['Physics stable target starts after245 game worlds, V2 variants after244 due prior OUT assertion abort. V2/sensor abort on release80 recapture, so no observed81 in that family.','upper-lanes28 and ramp15 game+3 standalone predecessor worlds match before target across all variants. Preceding world trajectories may differ by geometry; world creation protocol/order is matched, not identical internal solver state.','Joint variant includes the four shared-solid substitutions and their collider assembly ordering. Does not separately isolate order from geometry.','Poststep manifolds do not capture all CCD/substep events. At first upper81 divergence only unchanged tail/floor poststep contacts recorded; old-socket geometric overlap is not an observed socket impulse there.','Instrumentation reads states/contact manifolds; exactboth release81 shot matches earlier uninstrumented failure, but no general observational-transparency/determinism theorem claimed.','No full54 rerun, no production/expectation edits, no final support design or strength validation.']}
(p/'findings.json').write_text(json.dumps(result,indent=2));print('matching physical comparisons',len(comparison),sum(x['physicalStatesExactlyEqual'] for x in comparison));print('first',first['tick'])
