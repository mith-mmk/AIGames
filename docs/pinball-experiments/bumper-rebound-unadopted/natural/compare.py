import pathlib,json,hashlib
p=pathlib.Path(__file__).parent
b,c=[json.loads((p/f'{x}.json').read_text()) for x in ['baseline','candidate']]
def extra(d):
 r=d['results'];return {'capped':[{'power':x['power'],'delay':x['delay'],'phase':x['phase'],'ramps':x['ramps']} for x in r if x['phase']!='gameover'],'kickbackUses':sum(x['kickbackUses'] for x in r),'sideSaveUses':sum(x['sideSaveUses'] for x in r),'coils':[sum(x['physicsMetrics']['coilImpulses'][i] for x in r) for i in [0,1]]}
rows=[]
for x,y in zip(b['results'],c['results']):
 assert (x['power'],x['delay'])==(y['power'],y['delay'])
 rows.append({'power':x['power'],'delay':x['delay'],'baseline':x,'candidate':y,'scoreDelta':y['score']-x['score'],'rampDelta':y['ramps']-x['ramps'],'shotDelta':y['shots']-x['shots']})
out={'baseline':b['summary'],'candidate':c['summary'],'baselineExtra':extra(b),'candidateExtra':extra(c),'largestScoreChanges':sorted(rows,key=lambda x:abs(x['scoreDelta']),reverse=True)[:8],'allComparisons':rows}
(p/'comparison.json').write_text(json.dumps(out,indent=2));print(json.dumps({k:v for k,v in out.items() if k not in ['largestScoreChanges','allComparisons']},indent=2))
