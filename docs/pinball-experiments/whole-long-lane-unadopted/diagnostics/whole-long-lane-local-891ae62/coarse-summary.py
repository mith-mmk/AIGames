import json,math,hashlib
from pathlib import Path
p=Path(__file__).parent;rows=[]
for mode in ['baseline','candidate']:
 for r in json.loads((p/(mode+'-coarse.json')).read_text())['results']:
  t=r['trace'];at=lambda k:next((a for a in t if a['tick']==k),None);post=[a for a in t if r['repress'] is not None and a['tick']>=r['repress']];last=t[-1];cap=at(r['capture']);pre=at(r['repress']-1) if r['repress'] else None;quiet=0
  for a in reversed(t):
   if math.hypot(*a['v'].values())<.05 and a['phase']=='playing':quiet+=1
   else:break
  def first(fn):
   for a in post:
    for c in a['contacts']:
     if fn(c):return {'tick':a['tick'],'p':a['p'],'v':a['v'],'contact':c}
  bat=any(c['bat'] for c in last['contacts']);end='ordinary-drain' if r['ball']==2 else 'held-recapture' if quiet>=30 and bat else 'nonbat-stop' if quiet>=30 else 'live-at-bound'
  rows.append({'mode':mode,'delay':r['delay'],'side':r['side'],'initial':r['nearest'],'captureTick':r['capture'],'captureLocal':cap['bat']['local'] if cap else None,'captureActualBatContact':any(c['bat'] for c in cap['contacts']) if cap else None,'preRepress':pre,'releaseU':[min(a['bat']['local'][0] for a in t if r['release']<=a['tick']<r['repress']),max(a['bat']['local'][0] for a in t if r['release']<=a['tick']<r['repress'])] if r['release'] else None,'coils':r['coils'],'reachedZminus1':r['refire'],'minPostZ':min((a['p']['z'] for a in post),default=None),'firstNonFloorBat':first(lambda c:c['handle']!=0 and not c['bat']),'firstSupport':first(lambda c:abs(c['center']['y']-.02)<1e-5 and not c['bat']),'end':end,'quietTailTicks':quiet,'last':last,'resets':r['resets']})
s={'scope':'36 fixed cases; coarse z threshold is not natural ramp/wire or continuous aim qualification','rows':rows};(p/'coarse-summary.json').write_text(json.dumps(s,indent=2));print('\n'.join(str({k:r[k] for k in ['mode','delay','side','captureActualBatContact','captureLocal','reachedZminus1','minPostZ','end']}) for r in rows));print('candidate first contacts',[(r['delay'],r['side'],r['firstNonFloorBat']['contact']['center'] if r['firstNonFloorBat'] else None) for r in rows if r['mode']=='candidate'])
