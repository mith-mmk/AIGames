import json
from pathlib import Path
p=Path(__file__).parent;d=json.loads((p/'coarse-summary.json').read_text())['rows'];out=[]
for r in d:
 shot=r['coils'][0]['shot'];row={k:r[k] for k in ['mode','side','delay','releaseU','reachedZminus1','end']};row.update({'preRepressLocalU':r['preRepress']['bat']['local'][0],'normalizedAlong':shot['along'],'aimAngle':shot['aimAngle'],'faceAngle':shot['faceAngle'],'coilP':shot['p'],'shotV':[shot['vx'],shot['vz']],'angularSpeed':shot['angularSpeed']});out.append(row)
(p/'timing-correspondence.json').write_text(json.dumps({'definition':'along is clamp((pivotX-abs(ballX))/(flipperCenter+flipperHalfLength),0,1) at actual coil; not bat-local u divided by length','rows':out},indent=2))
