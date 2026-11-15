import json,pathlib,hashlib
p=pathlib.Path(__file__).parent
read=lambda n:json.loads((p/n).read_text())
d=read('candidate-save-sweep-detailed.json'); old=read('candidate-save-sweep.json');base=read('baseline-save-sweep.json')
assert all({k:v for k,v in a.items() if k!='trace'}=={k:v for k,v in b.items() if k!='trace'} for a,b in zip(d['results'],old['results']))
g=json.JSONDecoder().raw_decode((p/'definition.mjs').read_text().split('Object.freeze(',1)[1])[0]
def at(path,z):
 for a,b in zip(path,path[1:]):
  if a[2]<=z<=b[2] and b[2]>a[2]:return a[0]+(b[0]-a[0])*(z-a[2])/(b[2]-a[2])
 return None
out=[]
for r,b in zip(d['results'],base['results']):
 if not(r['spec']['charged'] and not r['spec']['tilted']):continue
 rows=[t for t in r['trace'] if t['phase']=='playing' and 3.45<t['p']['z']<3.72]
 approach=[t for t in r['trace'] if t['phase']=='playing' and 1.35<=t['p']['z']<=3.72 and at(g['paths'][0],t['p']['z']) is not None and at(g['paths'][2],t['p']['z']) is not None]
 between=lambda t:at(g['paths'][2],t['p']['z'])<t['p']['x']<at(g['paths'][0],t['p']['z'])
 out.append({'spec':r['spec'],'saved':bool(r['firstSave']),'baselineSaved':bool(b['firstSave']),'initialLegal':r['initialLegal'],'remainingCharge':r['remainingCharge'],'events':r['events'],'window':rows,'allWindowCentersBetweenRails':all(map(between,rows)),'approachCentersOutsideRails':sum(not between(t) for t in approach),'windowXRange':[min(t['p']['x'] for t in rows),max(t['p']['x'] for t in rows)] if rows else None,'windowTriggerEligible':sum(-2.62<t['p']['x']<-2.08 and t['p']['y']<.5 and t['v']['z']>0 for t in rows)})
result={'method':'Every tick replay; all 50 outcomes excluding trace exactly equal original. Center between polyline rail X at equal Z is topological lane classification, not full-sphere clearance or contact proof. Charge injected, not naturally earned. Saved rows may include later passes. No force/geometry changes. Trigger is center condition, not a collision sensor.','cases':out,'missed':sum(not x['saved'] for x in out),'rawSHA256':hashlib.sha256((p/'candidate-save-sweep-detailed.json').read_bytes()).hexdigest()}
(p/'save-classification.json').write_text(json.dumps(result,indent=2))
for r in out:
 if not r['saved']:print(r['spec']['name'],r['allWindowCentersBetweenRails'],r['approachCentersOutsideRails'],r['windowXRange'],r['windowTriggerEligible'])
