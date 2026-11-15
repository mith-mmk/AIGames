from pathlib import Path
import json,gzip,hashlib,math
root=Path(__file__).resolve().parents[3];out=Path(__file__).parent
naturalPath=root/'docs/pinball-experiments/save-pocket-preflight/natural/observations.json.gz';forkPath=root/'docs/pinball-experiments/save-vertical-fork-study/evidence/result.json';sourcePath=root/'docs/pinball-experiments/save-vertical-fork-study/payload/sources.json.gz'
natural=json.loads(gzip.decompress(naturalPath.read_bytes()));fork=json.loads(forkPath.read_text());sources=json.loads(gzip.decompress(sourcePath.read_bytes()));radius=.135
parts=[]
for p in fork['inventory']:
 a=p['min'].copy();b=p['max'].copy()
 if p['group']=='fork':b[1]+=.27
 parts.append({'name':p['name'],'min':a,'max':b})
def overlap(pos):
 for p in parts:
  d=[max(p['min'][i]-pos[k],0,pos[k]-p['max'][i])for i,k in enumerate(['x','y','z'])]
  if math.sqrt(sum(x*x for x in d))<radius:return p['name']
 return None
def crossing(rows,z,eventTick):
 for r in rows:
  if r['tick']>eventTick:continue
  a,b=r['before'],r['after']
  if a['p']['z']<z<=b['p']['z']:
   t=(z-a['p']['z'])/(b['p']['z']-a['p']['z']);return {'tick':r['tick'],'withinStepFraction':t,'interpolatedTimeTicks':r['tick']+t,'p':{k:a['p'][k]+t*(b['p'][k]-a['p'][k])for k in ['x','y','z']},'v':{k:a['v'][k]+t*(b['v'][k]-a['v'][k])for k in ['x','y','z']}}
 return None
cases=[]
for c in natural['cases']:
 e=c['events'][0];rows=c['windows'][0]['rows'];prior=[r for r in rows if r['tick']<e['tick']];samples=[{'tick':r['tick'],'stage':stage,'snapshot':r[stage],'occupiedPart':overlap(r[stage]['p'])}for r in rows if r['tick']<=e['tick']for stage in ['before','after']];first=next((s for s in samples if s['occupiedPart']),None);near=crossing(rows,3.32,e['tick']);face=crossing(rows,3.54-radius,e['tick']);cases.append({'ordinal':c['ordinal'],'saveTick':e['tick'],'firstRecordedTick':rows[0]['tick'],'chargeValuesBeforeSave':sorted(set(r[stage]['charge']for r in prior for stage in ['before','after'])),'ballNumbersBeforeSave':sorted(set(r[stage]['ball']for r in prior for stage in ['before','after'])),'earningTime':'Not recorded; already charged at beginning of window. Could have earned on an earlier ball.','chargePresentAtLeastSecondsBeforeSave':(e['tick']-rows[0]['tick'])/120,'firstSampledDeploymentSweepOccupancy':first,'observedPrefixUntilFirstOccupiedSeconds':(first['tick']-rows[0]['tick'])/120 if first else None,'z3_32Crossing':near,'faceSphereFrontContactPlaneCrossing':face,'interpolatedLeadFromZ3_32ToFaceSeconds':(face['interpolatedTimeTicks']-near['interpolatedTimeTicks'])/120 if near and face else None,'saveBeforeImpulse':e['before']})
report={'scope':'Offline source/window analysis only. No geometry changes, gameplay runs, actuator or power tests. Linear within-step crossing estimates are not safe actuation deadlines. Endpoint-empty intervals do not prove continuously safe finite-time deployment.','cases':cases,'sourceHashes':{k:hashlib.sha256(sources[k].encode()).hexdigest()for k in ['web/js/pinball/game-state.mjs','web/js/pinball/missions.mjs','web/js/pinball/physics.mjs']},'inputs':[{'path':str(f.relative_to(root)),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()}for f in [naturalPath,forkPath,sourcePath]],'energyIllustration':{'movingMassAssumedOnly':.08,'lift':.27,'gravityY':97.46939904187322,'raisedGravitationalEnergy':.08*.27*97.46939904187322,'meaning':'Illustration only: real moving assembly mass is unassigned. Lowering can release this energy even before firing, so deployment/holding/retraction must be in the energy ledger.'}}
earningFile=out/'earning-observations.json'
if earningFile.exists():
 observed=json.loads(earningFile.read_text());comparison=json.loads((out/'natural-comparison.json').read_text());assert comparison['all54RecordsEqual'] and comparison['bytesEqual'];actual=[]
 for c in observed['cases']:
  if not c['earns']:continue
  earns=[]
  for e in c['earns']:
   at=e['after'];earns.append({'tick':e['tick'],'event':e['event'],'before':e['before'],'after':at,'deploymentSweepOccupiedAtEarn':overlap(at['p'])})
  saves=[]
  for save in c['saves']:
   e=max((e for e in c['earns']if e['tick']<=save['tick']),key=lambda e:e['tick']);before=save['beforeOriginalImpulse'];vx,vz=before['v']['x'],before['v']['z'];saves.append({'saveTick':save['tick'],'earnTick':e['tick'],'earnBall':e['after']['ball'],'saveBall':before['ball'],'lagSeconds':(save['tick']-e['tick'])/120,'beforeOriginalImpulse':before,'legacyHorizontalEnergyBefore':.5*.08*(vx*vx+vz*vz),'legacyTargetHorizontalEnergy':5.76,'legacyInstantaneousHorizontalEnergyChange':.5*.08*(144-vx*vx-vz*vz)})
  carried=[d for d in c['drains']if d['before']['charge']==1 and d['after']['charge']==1 and d['before']['ball']!=d['after']['ball']]
  actual.append({'ordinal':c['ordinal'],'earns':earns,'saves':saves,'carriedAcrossDrain':carried,'finalCharge':c['final']['charge']})
 report['actualEarningObservation']={'auditRecordsIdentical':comparison,'earns':sum(len(c['earns'])for c in observed['cases']),'saves':sum(len(c['saves'])for c in observed['cases']),'tiltTransitionsObserved':sum(len(c['tiltChanges'])for c in observed['cases']),'resetBallCallsObserved':sum(c['resetCallCount']for c in observed['cases']),'cases':actual,'observationSHA256':hashlib.sha256(earningFile.read_bytes()).hexdigest()}
 for c in report['cases']:c['earningTime']='Not located by the short window alone; exact independent observation is included in actualEarningObservation.'
(out/'timing-and-source-evidence.json').write_text(json.dumps(report,indent=2)+'\n')
for c in cases:print(c['ordinal'],'chargeLead>=',c['chargePresentAtLeastSecondsBeforeSave'],'observedEmptyPrefix',c['observedPrefixUntilFirstOccupiedSeconds'],'lateLead',c['interpolatedLeadFromZ3_32ToFaceSeconds'],'firstOccupied',c['firstSampledDeploymentSweepOccupancy']['occupiedPart'])
