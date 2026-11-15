import json,math,hashlib
from pathlib import Path
p=Path(__file__).parent;out={}
for mode in ['accepted','baseline','candidate']:
 rows=[]
 for r in json.loads((p/(mode+'.json')).read_text())['results']:
  t=r['trace'];quiet=0
  for a in reversed(t):
   if a['phase']=='playing' and math.hypot(*a['v'].values())<.05:quiet+=1
   else:break
  rows.append({**{k:v for k,v in r.items() if k not in ['trace','events','barContacts']},'last':t[-1],'quietTailTicks':quiet,'eventTypes':[e['type'] for e in r['events']]})
 launch=json.loads((p/(mode+'-launch55-contacts.json')).read_text())['results'][0];t=launch['trace'];out[mode]={'natural':rows,'out':[{k:v for k,v in r.items() if k!='trace'} for r in json.loads((p/(mode+'-out.json')).read_text())['results']],'launch55':{'turn':min(t,key=lambda a:a['p']['z']),'firstRail':next((a for a in t if any(c['type']==2 for c in a['contacts'])),None),'sameAsNaturalPV':all(a['p']==b['p'] and a['v']==b['v'] for a,b in zip(t,json.loads((p/(mode+'.json')).read_text())['results'][0]['trace']))}}
(p/'summary.json').write_text(json.dumps(out,indent=2));(p/'manifest.json').write_text(json.dumps({'sourceSHA256':hashlib.sha256(Path('artifacts/pinball/upper-connector-long-4f4170a/sources.json').read_bytes()).hexdigest(),'files':{f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in p.iterdir() if f.is_file() and f.name!='manifest.json'}},indent=2))
