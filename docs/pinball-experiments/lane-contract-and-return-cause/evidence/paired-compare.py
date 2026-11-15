import json,math
from pathlib import Path
p=Path(__file__).parent
norm=lambda a,b:math.sqrt(sum((x-y)**2 for x,y in zip(a,b)))
res=[]
for family in ['lower','physics']:
 for delay in range(80,85):
  a=json.loads((p/f'baseline-{family}-{delay}.json').read_text());b=json.loads((p/f'candidate-{family}-{delay}.json').read_text())
  def enrich(data,row):
   if not row:return None
   rr=dict(row);rr['contacts']=[dict(c,object=data['descriptors'][c['id']])for c in row['contacts']];return rr
  diff=[]
  for x,y in zip(a['rows'],b['rows']):
   if x['stage']!=y['stage']:break
   ep=norm(x['after']['p'],y['after']['p']);ev=norm(x['after']['v'],y['after']['v'])
   if ep>1e-7 or ev>1e-6:diff.append((x,y,ep,ev))
  first=diff[0]if diff else None
  firstReturn=next(((x,y,ep,ev)for x,y,ep,ev in diff if x['after']['ramp'] and y['after']['ramp']),None)
  row={'family':family,'delay':delay,'baseline':{k:a[k]for k in ['cradle','checkpoint','final','events']},'candidate':{k:b[k]for k in ['cradle','checkpoint','final','events']},'firstDifference':None if not first else {'baseline':enrich(a,first[0]),'candidate':enrich(b,first[1]),'positionDelta':first[2],'velocityDelta':first[3]},'firstBothAfterRamp':None if not firstReturn else {'baseline':enrich(a,firstReturn[0]),'candidate':enrich(b,firstReturn[1]),'positionDelta':firstReturn[2],'velocityDelta':firstReturn[3]}}
  res.append(row)
  print(family,delay,'ramps',a['checkpoint']['ramp'],b['checkpoint']['ramp'],'phase',a['checkpoint']['phase'],b['checkpoint']['phase'],'first',None if not first else(first[0]['tick'],first[0]['stage'],first[2],first[3]),'cradleD',norm(a['cradle']['p'],b['cradle']['p']))
(p/'comparison.json').write_text(json.dumps(res,indent=2))
