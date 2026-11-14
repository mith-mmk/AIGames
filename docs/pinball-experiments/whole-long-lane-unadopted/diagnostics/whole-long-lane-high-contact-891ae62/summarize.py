import json,hashlib,math
from pathlib import Path
p=Path(__file__).parent;d=json.loads((p/'trace.json').read_text());t=[r for r in d['trace'] if r['phase']=='playing'];m=min(t,key=lambda r:r['railGap']['gap']);runs=[];n=0
for r in t:
 if r['railGap']['gap']<0:n+=1
 else:runs.append(n);n=0
runs.append(n)
s={'sourceSHA256':d['hash'],'fixture':'one explicit restored high start; natural reachability unverified','initial':d['initial'][0],'ticks':len(d['trace']),'seconds':len(d['trace'])/120,'final':d['final'],'independentRailMinimum':m,'negativeRailGapFrames':sum(r['railGap']['gap']<0 for r in t),'longestNegativeRun':max(runs),'maximumManifoldOverlap':-min(pt['dist'] for r in t for c in r['contacts'] for pt in c['points']),'firstAxisEnd':next((r['tick'] for r in t if r['p']['z']>=4.85),None),'lastPlaying':t[-1],'railGapDefinition':'distance to designer finite axis segment minus rail radius minus ball .135; analytic capsule surface, not generic mesh query; frozen source endpoints Float32 rounding separate','sha256':{f:hashlib.sha256((p/f).read_bytes()).hexdigest() for f in ['run.mjs','trace.json']}}
(p/'summary.json').write_text(json.dumps(s,indent=2));print({k:v for k,v in s.items() if k not in ['independentRailMinimum','lastPlaying','final']})
