import pathlib,json,gzip,hashlib,math
p=pathlib.Path(__file__).parent
load=lambda s,d:json.loads(gzip.decompress((p/f'{s}-{d}.json.gz').read_bytes()))
report={'repeatability':{},'comparisons':{},'outcomes':{}}
for name in ['baseline','v2']:
 ds=[]
 for delay in range(80,85):
  if not (p/f'{name}-2-{delay}.json.gz').exists():continue
  a,b=load(name+'-1',delay),load(name+'-2',delay)
  ds.append({'delay':delay,'entireTraceIdentical':a==b,'frames':len(a['rows'])})
 report['repeatability'][name]=ds
for name in ['baseline','v2','front-only','additions-only']:
 report['outcomes'][name]=json.loads((p/f'{name}-1.json').read_text())
 if name=='baseline':continue
 pairs=[]
 for delay in range(80,85):
  if not (p/f'{name}-1-{delay}.json.gz').exists():continue
  a,b=load('baseline-1',delay),load(name+'-1',delay)
  diff=next((i for i,(x,y) in enumerate(zip(a['rows'],b['rows'])) if x['after']!=y['after']),None)
  order=next((i for i,(x,y) in enumerate(zip(a['rows'],b['rows'])) if [c['id'] for c in x['contacts']]!=[c['id'] for c in y['contacts']]),None)
  active=lambda r:[c['id'] for c in r['contacts'] if c['points']]
  activeDiff=next((i for i,(x,y) in enumerate(zip(a['rows'],b['rows'])) if active(x)!=active(y)),None)
  pairs.append({'delay':delay,'firstStateDifference':diff,'firstPairEnumerationDifference':order,'firstNonemptyPairOrderDifference':activeDiff,'baseline':None if diff is None else a['rows'][diff],'candidate':None if diff is None else b['rows'][diff],'previousStatesIdentical':diff is None or a['rows'][diff]['before']==b['rows'][diff]['before'],'firstPairBaseline':a['rows'][order] if order is not None else None,'firstPairCandidate':b['rows'][order] if order is not None else None})
 report['comparisons'][name]=pairs
(p/'analysis.json').write_text(json.dumps(report,indent=2))
for k,v in report['repeatability'].items():print(k,v)
for k,v in report['comparisons'].items():print(k,[(x['delay'],x['firstStateDifference'],x['firstPairEnumerationDifference'],x['firstNonemptyPairOrderDifference']) for x in v])
for k,v in report['outcomes'].items():print(k,[(x['delay'],x['last']['ramps']) for x in v['results']])
