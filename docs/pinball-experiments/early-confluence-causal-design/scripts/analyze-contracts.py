import json,pathlib,gzip,hashlib,collections
p=pathlib.Path(__file__).parent;q=p.parent/'early-confluence-696c646';read=lambda d,n:json.loads((d/n).read_text());sha=lambda b:hashlib.sha256(b).hexdigest()
def crossing(rows,z):
 for a,b in zip(rows,rows[1:]):
  if a['p']['z']<z<=b['p']['z'] and b.get('phase','playing')=='playing':
   t=(z-a['p']['z'])/(b['p']['z']-a['p']['z']);return {'p':{k:a['p'][k]+t*(b['p'][k]-a['p'][k]) for k in ['x','y','z']},'v':b['v'],'ticks':[a.get('tick'),b.get('tick')]}
 return None
station=3.32;board=.04;switchTop=board;r=.135
# At this straight section, exact path centerlines are -2.33 and -1.90.
def eligibility(c):
 if not c:return False
 a=c['p'];return -2.33+.020<a['x']<-1.90-.020 and board<=a['y']<=switchTop+r and c['v']['z']>0
results=[]
for mode in ['baseline','candidate']:
 d=read(q,mode+'-save-sweep'+('-detailed' if mode=='candidate' else '')+'.json')
 for case in d['results']:
  if case['spec']['tilted'] or not case['spec']['charged']:continue
  crossingState=crossing(case['trace'],station);results.append({'mode':mode,'spec':case['spec'],'crossing':crossingState,'proposedCandidateStripEligible':eligibility(crossingState),'existingSave':bool(case['firstSave']),'savedAt':case['firstSave'],'legacySampling':'1/120s' if mode=='candidate' else '.1s (interpolated, not precise contact proof)'})
ins=[]
for f in sorted(q.glob('candidate-in-*.json.gz')):
 d=json.loads(gzip.decompress(f.read_bytes()));rows=[]
 for row in d['rows']:
  s=row.get('after',row);P=s['p'];V=s['v'];rows.append({'p':dict(zip(['x','y','z'],P)),'v':dict(zip(['x','y','z'],V)),'phase':s['phase'],'tick':row['tick']})
 c=crossing(rows,station);ins.append({'file':f.name,'crossing':c,'eligible':eligibility(c)})
# Source cost inventory, unbatched meshes. Exact triangle delta agrees installed render.
cost={}
for mode in ['baseline','candidate']:
 ms=read(p,mode+'-inventory.json')['meshes'];rails=[m for m in ms if m['name']=='shared-lower-lane-contact-rail'];cost[mode]={'meshCount':len(ms),'triangles':sum(m['triangles'] for m in ms),'railGroups':[[list(k),v] for k,v in collections.Counter((m['geometry'],m['triangles']) for m in rails).items()]}
comparisons=[]
for family in ['ramp','upper-lanes']:
 paths=[q/f'baseline-{family}-82.json.gz',q/f'candidate-{family}-82.json.gz',p/f'candidate-{family}-82.json.gz'];data=[json.loads(gzip.decompress(f.read_bytes())) for f in paths]
 pairs=[]
 for ia,ib,label in [(0,2,'baseline-vs-ordered'),(1,2,'original-candidate-vs-ordered')]:
  d,e=data[ia],data[ib];first=next(((a,b)for a,b in zip(d['rows'],e['rows'])if a['after']!=b['after']),None)
  pairs.append({'pair':label,'firstDivergence':{'tick':first[0]['tick'],'a':first[0],'b':first[1]}if first else None})
 comparisons.append({'family':family,'comparisons':pairs,'tick1':[{ 'file':str(f),'sha256':sha(f.read_bytes()),'state':d['rows'][1],'descriptors':[d['descriptors'][c['id']]for c in d['rows'][1]['contacts']]}for f,d in zip(paths,data)]})
synthetic=[{'p':{'x':x,'y':y,'z':station},'v':{'x':0,'y':0,'z':vz}} for x,y,vz in [(-1.72,.175,2),(-2.5,.175,2),(-2.1,.21,2),(-2.1,.175,-2)]]
assert all(not eligibility(c) for c in synthetic)
wire=read(q,'candidate.json');wireRows=[{'p':dict(zip(['x','y','z'],row['after']['p'])),'v':dict(zip(['x','y','z'],row['after']['v'])),'phase':row['after']['phase'],'tick':row['tick']}for row in wire['rows']];wireCross=crossing(wireRows,station)
configs=[read(p,m+'-config.json')['records'][30]for m in ['baseline','candidate','ordered']];settings=[read(p,m+'-settings.json')for m in ['baseline','candidate','ordered']]
configProof={'matchedWorldOrdinal':30,'builtExactlyEqual':configs[0]['built']==configs[1]['built']==configs[2]['built'],'launchExactlyEqual':configs[0]['launches']==configs[1]['launches']==configs[2]['launches'],'tick0ExactlyEqual':configs[0]['ticks'][0]==configs[1]['ticks'][0]==configs[2]['ticks'][0],'explicitFreshSettingsEqual':all({k:v for k,v in x.items()if k!='mode'}=={k:v for k,v in settings[0].items()if k!='mode'}for x in settings),'selected':dict(zip(['baseline','candidate','ordered'],configs))}
report={'configurationProof':configProof,'wireReturnCrossing':{'crossing':wireCross,'eligible':eligibility(wireCross)},'syntheticCheckStates':synthetic,'stationProposal':{'z':station,'railCenterlines':[-2.33,-1.90],'stockRadius':.020,'stripXBounds':[-2.31,-1.92],'boardTop':board,'proposedFlushSwitchTop':switchTop,'maximumBallCenterY':switchTop+r,'meaning':'Design-only finite floor switch strip; forward swept crossing with center owned by OUT side of both rails. No geometry/force/trigger implementation. Explicitly changes legacy any-inside, y<.5 behavior. Physical housing remains inconsistent.'},'saveCrossings':results,'inCrossings':ins,'syntheticExclusion':{'INCenterX':-1.72,'outsideCandidateRailX':-2.5,'airborneCenterY':.21,'reverseVz':-2,'allExcludedByRule':True},'renderCost':cost,'ordering':comparisons}
(p/'contract-analysis.json').write_text(json.dumps(report,indent=2))
print('Candidate20 strip coverage',sum(x['proposedCandidateStripEligible']for x in results if x['mode']=='candidate'));print('Baseline20 same strip coverage',sum(x['proposedCandidateStripEligible']for x in results if x['mode']=='baseline'));print('IN exclusions',len(ins),sum(x['eligible']for x in ins));print('render cost',cost)
