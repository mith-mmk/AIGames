import json,math,hashlib
from pathlib import Path
p=Path(__file__).parent;out={}
for mode in ['baseline','candidate']:
 a=json.loads((p/(mode+'-coarse.json')).read_text())['results'];b=json.loads((p/(mode+'-extension.json')).read_text())['results'];rs=[]
 for side in [-1,1]:
  x=next(r for r in a if r['delay']==70 and r['side']==side);y=next(r for r in b if r['delay']==70 and r['side']==side)
  pairs=list(zip(x['trace'],y['trace']));first=next(({'tick':u['tick'],'oldP':u['p'],'newP':v['p'],'oldV':u['v'],'newV':v['v']} for u,v in pairs if u['p']!=v['p'] or u['v']!=v['v']),None)
  rs.append({'side':side,'firstPVdifference':first,'oldCapture':x['capture'],'newCapture':y['capture'],'oldShot':x['coils'][0]['shot'],'newShot':y['coils'][0]['shot'],'oldReached':x['refire'],'newReached':y['refire'],'oldFinal':x['final'],'newFinal':y['final'],'oldTicks':len(x['trace']),'newTicks':len(y['trace']),'exactCommonPV':first is None})
 out[mode]=rs
(p/'extension-70-comparison.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
files=['extension.mjs','extension-summary.py','extension-compare.py','extension-summary.json','extension-70-comparison.json','baseline-extension.json','candidate-extension.json'];(p/'extension-manifest.json').write_text(json.dumps({'sourceHash':hashlib.sha256(Path('artifacts/pinball/whole-long-lane-891ae62/sources.json').read_bytes()).hexdigest(),'hashes':{f:hashlib.sha256((p/f).read_bytes()).hexdigest() for f in files}},indent=2))
