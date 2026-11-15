import json,hashlib
from pathlib import Path
p=Path(__file__).parent
out={'definition':'z<-1 after observed quiet capture/repress with real coil and no reset, not ramp/wire or full-game qualification. 1-tick samples are not sub-tick continuity. World starts differ semantically by lane; normalized-along and world coordinates are preserved.','batches':[],'rows':[],'orderComparison':[]}
def runs(nums):
 a=[]
 for n in sorted(nums):
  if a and n==a[-1][-1]+1:a[-1].append(n)
  else:a.append([n])
 return [{'start':r[0],'end':r[-1],'count':len(r),'endpointMilliseconds':(r[-1]-r[0])*1000/120} for r in a]
for mode in ['accepted','candidate']:
 ds={}
 for order in ['asc','desc']:
  f=p/f'{mode}-{order}.json'
  if not f.exists():continue
  d=json.loads(f.read_text());
  for r in d['results']:
   if r.get('phase')=='ready' and r.get('ball')==1:r['endClass']='sameball-ready-shooter'
  ds[order]=d
  for side in [-1,1]:
   rr=[r for r in d['results'] if r['side']==side];success=[r['delay'] for r in rr if r.get('refire') and r['coils'] and r.get('resets')==0 and r.get('capture') is not None]
   rs=runs(success);out['batches'].append({'mode':mode,'order':order,'side':side,'count':len(rr),'complete':len(rr)==71,'successCount':len(success),'successDelays':success,'runs':rs,'longest':max(rs,key=lambda r:r['count']) if rs else None,'ends':{e:sum(r['endClass']==e for r in rr) for e in sorted(set(r['endClass'] for r in rr))}})
   for r in rr:
    shot=r['coils'][0]['shot'] if r['coils'] else {};o=r.get('observation',{});out['rows'].append({'mode':mode,'order':order,'side':side,'delay':r['delay'],'capture':r.get('capture'),'repress':r.get('repress'),'refire':r.get('refire'),'end':r['endClass'],'along':shot.get('along'),'aim':shot.get('aimAngle'),'coilP':shot.get('p'),'releaseP':o.get('release',{}).get('p'),'releaseLocal':o.get('release',{}).get('bat',{}).get('local'),'minZ':o.get('minZ'),'traceHash':r.get('traceHash')})
 if len(ds)==2:
  aa={(r['side'],r['delay']):r for r in ds['asc']['results']};bb={(r['side'],r['delay']):r for r in ds['desc']['results']}
  for key in sorted(aa.keys()&bb.keys()):
   a,b=aa[key],bb[key];out['orderComparison'].append({'mode':mode,'side':key[0],'delay':key[1],'refireSame':a.get('refire')==b.get('refire'),'endSame':a['endClass']==b['endClass'],'captureSame':a.get('capture')==b.get('capture'),'traceBytesSame':a.get('traceHash')==b.get('traceHash'),'ascRefire':a.get('refire'),'descRefire':b.get('refire')})
(p/'summary.json').write_text(json.dumps(out,indent=2))
for b in out['batches']:print({k:v for k,v in b.items() if k not in ['successDelays','runs']})
