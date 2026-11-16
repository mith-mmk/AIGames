import json,pathlib,math,gzip
p=pathlib.Path(__file__).parent;b,c=[json.loads(gzip.decompress((p/f'{x}.json.gz').read_bytes())) for x in ['baseline','candidate']]
dot=lambda a,b:sum(x*y for x,y in zip(a,b))
out=[]
for a,z in zip(b,c):
 idx=next(i for i,(x,y) in enumerate(zip(a['frames'],z['frames'])) if x['post']!=y['post']);ea=next(e for e in a['events'] if e['tick']==idx);ez=next(e for e in z['events'] if e['tick']==idx)
 center=ea['center'];pos=ea['pre']['p'];r=[pos[0]-center[0],pos[2]-center[1]];length=math.hypot(*r);n=[x/length for x in r];t=[-n[1],n[0]]
 def components(e):
  return {k:{'normal':dot([s['v'][0],s['v'][2]],n),'tangent':dot([s['v'][0],s['v'][2]],t),'kineticPerMass':dot(s['v'],s['v'])/2} for k,s in [('pre',e['pre']),('post',e['post'])]}
 pre=a['frames'][idx]['pre']['p'];start=[pre[0]-center[0],pre[2]-center[1]];d=[r[i]-start[i] for i in [0,1]];A=dot(d,d);B=2*dot(start,d);C=dot(start,start)-.535**2;D=B*B-4*A*C;toi=None
 if D>=0:
  q=(-B-math.sqrt(D))/(2*A)
  if 0<=q<=1:
   hit=[start[i]+q*d[i] for i in [0,1]];nt=[v/.535 for v in hit];v=[ea['pre']['v'][0],ea['pre']['v'][2]];vn=dot(v,nt);vt=[v[i]-vn*nt[i] for i in [0,1]];target=max(6,-vn*.56);toi={'fraction':q,'normal':nt,'normalDifferenceDegrees':math.degrees(math.acos(max(-1,min(1,dot(nt,n))))),'incomingNormal':vn,'illustrativeRestitutionOutgoing':[vt[i]+target*nt[i] for i in [0,1]],'limitation':'Straight chord sphere-cylinder side intersection; not internal Rapier TOI. No candidate run.'}
 traces={}
 for label,data in [('baseline',a),('candidate',z)]:
  seq=[];last=None
  for f in data['frames'][idx:]:
   active=[(x['id'],(x.get('hit')or{}).get('type'),(x.get('hit')or{}).get('key'),x.get('flipper')) for x in f['contacts'] if x['id']!=0]
   if active and active!=last:seq.append({'tick':f['tick'],'p':f['post']['p'],'v':f['post']['v'],'contacts':active})
   last=active
  traces[label]={'sequence':seq,'lastPlaying':next((f for f in reversed(data['frames']) if f['post']['phase']=='playing'),None),'final':data['final']}
 out.append({'release':a['release'],'firstDifference':idx,'captureEqual':a['capture']==z['capture'],'preEventEqual':ea['pre']==ez['pre'],'endpointNormal':n,'manifoldNormal':ea['manifolds'][0]['normal'],'endpointSpherePenetration':.535-length,'baselineComponents':components(ea),'candidateComponents':components(ez),'chordTOI':toi,'paths':traces})
(p/'analysis.json').write_text(json.dumps(out,indent=2))
print(json.dumps(out[3],indent=2))
