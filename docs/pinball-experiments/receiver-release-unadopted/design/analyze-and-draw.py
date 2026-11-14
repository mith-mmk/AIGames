from pathlib import Path
import json, math, hashlib, html
R=Path.cwd();P=R/'artifacts/pinball/receiver-release-plan-16e7e13';G=R/'artifacts/pinball/option-c-local-gates-1add1b7'
b=json.loads((R/'docs/pinball-experiments/whole-layout-constraints-4b3b4f0/accepted-geometry.json').read_text())
raw={m:json.loads((G/(m+'-coarse.json')).read_text())['results'] for m in ['baseline','candidate']}
dep=json.loads((G/'departure-analysis.json').read_text())
accepted=next(x for x in b['lanes'] if x['side']==1)['paths']
def frame(t):
 shift=.415;run=1.1;rad=(run*run+shift*shift)/(4*shift);A=2*math.atan(shift/run);q=t*2
 if q<=1:a=q*A;x=1.9-rad*(1-math.cos(a));z=3+rad*math.sin(a)
 else:a=(2-q)*A;x=1.9-rad*(1-math.cos(A))-rad*(math.cos(a)-math.cos(A));z=3+rad*math.sin(A)+rad*(math.sin(A)-math.sin(a))
 return x,z,math.cos(a),math.sin(a)
rows=[frame(i/48) for i in range(49)]
cpaths=[[[x,.22,z] for x,z,nx,nz in rows]+[[1.485,.22,4.85]],[[1.35,.22,2.75],[1.35,.22,3.35]],[[2.33,.22,1.35]]+[[x+.43*nx,.22,z+.43*nz] for x,z,nx,nz in rows]+[[1.915,.22,4.85]]]
tail=[[x+.15,y,z] for x,y,z in accepted[0] if z>=4.02838]
start=cpaths[0][24];end=tail[0];nxt=tail[1];d=[nxt[0]-end[0],nxt[2]-end[2]];length=math.hypot(*d);d=[v/length for v in d]
# Concept drawing control points only. No runtime module, loader or collider is generated.
c1=[start[0]-.20*rows[24][3],.22,start[2]+.20*rows[24][2]]
c2=[end[0]-.21*d[0],.22,end[2]-.21*d[1]]
def bez(a,b,c,d,n=48):return [[(1-t)**3*a[j]+3*(1-t)**2*t*b[j]+3*(1-t)*t*t*c[j]+t**3*d[j] for j in range(3)] for t in [i/n for i in range(n+1)]]
connector=bez(start,c1,c2,end)
outerStart=cpaths[2][25];outerEnd=[1.865,.22,4.35]
o1=[outerStart[0]-.16*rows[24][3],.22,outerStart[2]+.16*rows[24][2]];o2=[1.865,.22,4.15]
outer=bez(outerStart,o1,o2,outerEnd)
proposal=[cpaths[0][:25]+connector[1:]+tail[1:],cpaths[1],cpaths[2][:26]+outer[1:]+[[1.865,.22,4.85]]]
anchors=[[1.9,.02,3], [start[0],.02,start[2]], [1.435,.02,4.65], [1.35,.02,2.75], [1.35,.02,3.10], [2.33,.02,1.35], [2.33,.02,3], [outerStart[0],.02,outerStart[2]], [1.865,.02,4.65]]
def segdist(p,a,b):
 d=[b[i]-a[i] for i in range(len(p))];ll=sum(x*x for x in d);t=max(0,min(1,sum((p[i]-a[i])*d[i] for i in range(len(p)))/ll)) if ll else 0
 return math.sqrt(sum((p[i]-a[i]-t*d[i])**2 for i in range(len(p))))
def nearest_path(p,path):return min(segdist(p,a,c) for a,c in zip(path,path[1:]))
# Distances below use discrete projected sphere centers, not a new simulated path.
reserve=[]
for mode,results in raw.items():
 for r in results:
  tr=[x for x in r['trace'] if x['tick']>=r['repress']]
  turn=next((i for i,x in enumerate(tr[1:],1) if x['v']['z']>0),len(tr)-1)
  tr=tr[:turn+1];cross=None
  for a,c in zip(tr,tr[1:]):
   if a['p']['z']>=3.35 and c['p']['z']<3.35:
    t=(3.35-a['p']['z'])/(c['p']['z']-a['p']['z']);cross={k:a['p'][k]+t*(c['p'][k]-a['p'][k]) for k in ['x','y','z']};break
  side=r['side'];shift=.15 if mode=='baseline' else 0
  samples=[x for x in tr if x['p']['z']>2.5]
  inn=[];posts=[];con=[]
  for x in samples:
   q=[side*x['p']['x']+shift,x['p']['y'],x['p']['z']]
   rail=segdist(q,[1.35,.22,2.75],[1.35,.22,3.35])-.155
   shaft=math.hypot(q[0]-1.35,q[2]-3.35)-.153
   inn.append(min(rail,shaft))
   posts.append(min(math.hypot(q[0]-a[0],q[2]-a[2])-.153 for a in anchors))
   con.append(nearest_path(q,connector)-.155)
  reserve.append({'mode':mode,'delay':r['delay'],'side':side,'firstOutboundCrossingZ3_35':cross,'projectedCrossingX':None if cross is None else cross['x']+side*shift,'projectionShift':side*shift,'samplesToFirstDownstreamTurnOrZ2_5':len(samples),'sampleMinimumOldInnerRailAndEndShaftGap':min(inn),'sampleMinimumProposedAnchorGap':min(posts),'sampleMinimumConceptConnectorGap':min(con),'firstDepartureMinimumZ':min(x['p']['z'] for x in tr)})
minsep=min(nearest_path(p,proposal[2]) for p in proposal[0])
def x_at(path,z):
 for a,c in zip(path,path[1:]):
  if a[2]<=z<=c[2] and c[2]>a[2]:return a[0]+(c[0]-a[0])*(z-a[2])/(c[2]-a[2])
 return None
width=[{'z':z,'horizontalAxisSeparation':x_at(proposal[2],z)-x_at(proposal[0],z)} for z in [3,3.55,3.8,4.05,4.1,4.35,4.65]]
data={'status':'One conceptual dimensioned design; no runtime source, geometry freeze, simulation or adoption.','base':'c1f7aeb','head':'16e7e13','conceptName':'Receiver-led early curve; fixed outward pivots, accepted-relative cradle, exit-aware supports','pivot':[1.4,.27,4.45],'batLength':1.14,'restProjectedGap':{'accepted':.5906935644,'C_and_concept':.8906935644},'receiverReference':{'method':'Accepted actual sampled terminal rail z>=4.028382 shifted outward .15, with the bat pivot shifted the same amount. Does not predict delivery or a new equilibrium.','sampledNeckMinimumX':min(p[0] for p in tail),'heelX':1.435,'heelEndZ':4.85,'tail':tail},'connectorControls':[start,c1,c2,end],'outerControls':[outerStart,o1,o2,outerEnd],'newAnchorStations':anchors,'retainedInnerRail':proposal[1],'staticDrawingMeasures':{'sampleAxisDistanceDividerToOuterMinimum':minsep,'bareStockRadius':.02,'notAFullHeightPassageProof':True,'horizontalSectionsNotNormalWidths':width},'projectionOnly':reserve,'projectionLimits':['Saved accepted trajectories translated outward .15 without recomputing any collision or dynamics.','First outbound Z3.35 crossing only; stop at first downstream turn.','Distance samples are not continuous trajectory, CCD, curvature or complete world clearance proofs.','Reported clearances concern the stated inner rail/shaft, proposed support stations and conceptual connector only, not sling clearance.'],'saveScope':'Keep existing C fixed frame/low cam in any initial comparative diagnosis; moving actuation and bracket completion are separate. No finished-machine/adoption claim.','notChanged':['Keys','Forces','Solver','Board/shooter/upper/ramp/wire/slings','Bat shape/angles'],'evidence':{str(p.relative_to(R)):{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size} for p in [G/'baseline-coarse.json',G/'candidate-coarse.json',G/'departure-analysis.json',G/'departure-findings.md',R/'artifacts/pinball/option-c-earlycurve-1add1b7/sources.json']}}
(P/'dimensions-and-reserve.json').write_text(json.dumps(data,indent=2)+'\n')
# Same-scale technical plan. Positive |X| points outboard. Left side is mirrored.
W,H=1560,1220;s=['<svg xmlns="http://www.w3.org/2000/svg" width="1560" height="1220" viewBox="0 0 1560 1220">','<style>text{font-family:Arial,sans-serif;fill:#183040}.title{font-size:27px;font-weight:bold}.head{font-size:21px;font-weight:bold}.body{font-size:17px}.small{font-size:15px}.tiny{font-size:13px}</style>','<rect width="1560" height="1220" fill="#f6f8fa"/>']
def txt(x,y,t,cl='body',color=None):s.append(f'<text x="{x}" y="{y}" class="{cl}"'+(f' style="fill:{color}"' if color else '')+'>'+html.escape(str(t))+'</text>')
def line(x1,y1,x2,y2,color='#798a98',width=1,dash=None):s.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{width}"'+(f' stroke-dasharray="{dash}"' if dash else '')+'/>')
def circ(x,y,rad,color,fill='none',width=2):s.append(f'<circle cx="{x}" cy="{y}" r="{rad}" fill="{fill}" stroke="{color}" stroke-width="{width}"/>')
def path(points,color,width=2,dash=None,fill='none'):
 st=' '.join(f'{x:.2f},{y:.2f}' for x,y in points);s.append(f'<polyline points="{st}" fill="{fill}" stroke="{color}" stroke-width="{width}" stroke-linejoin="round"'+(f' stroke-dasharray="{dash}"' if dash else '')+'/>')
S=174;y0=220;z0=2.5
for col,(name,paths,pivot,mode) in enumerate([('Accepted: measured traces',accepted,1.25,'baseline'),('C: measured traces, rejected',cpaths,1.40,'candidate'),('Next: ONE concept, unproved',proposal,1.40,'concept')]):
 bx=20+col*515;xx=lambda x:bx+20+x*S;yy=lambda z:y0+(z-z0)*S
 s.append(f'<rect x="{bx}" y="122" width="500" height="705" rx="12" fill="white" stroke="#bdcbd5"/>');txt(bx+18,157,name,'head')
 txt(bx+18,185,'Left side mirrored; |X| grows outboard.','small')
 for z in [2.75,3,3.35,3.55,4.1,4.45,4.85]:
  line(bx+15,yy(z),bx+480,yy(z),'#e1e7ec');txt(bx+5,yy(z)-5,f'{z:.2f}','tiny','#6c7a85')
 for i,p in enumerate(paths):path([(xx(v[0]),yy(v[2])) for v in p if v[2]>=2.5],['#245f83','#748799','#956d31'][i],6 if mode!='concept' else 4, '7 3' if mode=='concept' else None)
 # actual sling outline excerpt
 sl=next(q for q in b['sling'] if q['side']==1)
 path([(xx(x),yy(z)) for x,z in sl['coverProjectionConvexHull'] if z>2.45]+[(xx(sl['coverProjectionConvexHull'][0][0]),yy(sl['coverProjectionConvexHull'][0][1]))], '#a5aeb6',2)
 for angle,color,dash in [(.48,'#4695a9',None),(-.6,'#a6b1b7','4 4')]:
  prof=[];hw=.14;heel=.08;tip=1.056;a=math.acos((.14-.084)/(tip-heel))
  for cx,rad,aa,bb in [(tip,.0831,a,-a),(heel,.1391,-a,a-2*math.pi)]:
   for i in range(41):
    th=aa+(bb-aa)*i/40;u=cx+rad*math.cos(th);w=rad*math.sin(th)
    X=pivot-math.cos(angle)*u-math.sin(angle)*w;Z=4.45-math.sin(angle)*u+math.cos(angle)*w;prof.append((xx(X),yy(Z)))
  path(prof+[prof[0]],color,2,dash)
 circ(xx(pivot),yy(4.45),5,'#183040','#183040')
 for delay,color in [(45,'#d27621'),(65,'#7a56a4')]:
  r=next(q for q in raw['baseline' if mode=='concept' else mode] if q['side']==-1 and q['delay']==delay)
  tr=[q for q in r['trace'] if r['release']<=q['tick']<=r['repress']+16 and q['p']['z']>=2.5]
  pts=[(xx(-q['p']['x']+(.15 if mode=='concept' else 0)),yy(q['p']['z'])) for q in tr]
  path(pts,color,2.8,'5 4' if mode=='concept' else None)
  cap=next(q for q in r['trace'] if q['tick']==r['capture'])['p'];X=-cap['x']+(.15 if mode=='concept' else 0)
  if delay==45:circ(xx(X),yy(cap['z']),.135*S,'#149572','#a4ddc840',2)
 if mode=='candidate':
  for X,Z in [(1.485,4.1),(1.35,3.35)]:circ(xx(X),yy(Z),.018*S,'#d14343','#d14343',2);circ(xx(X),yy(Z),.153*S,'#dc8d8d',width=1)
  txt(bx+20,708,'Red circles: ball-center exclusion about shafts.','small','#a23c3c')
 if mode=='concept':
  for X,Y,Z in anchors:
   if Z>=2.5:circ(xx(X),yy(Z),.018*S,'#175f91','#175f91',2)
  for X,Z in [(1.485,4.1),(1.35,3.35)]:line(xx(X)-7,yy(Z)-7,xx(X)+7,yy(Z)+7,'#c44444',2);line(xx(X)+7,yy(Z)-7,xx(X)-7,yy(Z)+7,'#c44444',2)
  txt(bx+20,708,'Dashed orange/purple: shifted OLD trace only.','small','#a85c19')
 if mode=='baseline':txt(bx+20,708,'Orange: release45; purple: release65.','small')
 txt(bx+20,742,'held center u '+('~.3546' if mode=='baseline' else '~.2137' if mode=='candidate' else '~.3546 TARGET, not a result'),'body')
 txt(bx+20,770, 'prestrike u60..70 '+('.243 -> .342' if mode=='baseline' else '-.064 -> -.060' if mode=='candidate' else 'recover a rolling RANGE'),'body')
 txt(bx+20,800,'Ball diameter .270 = '+str(round(.27*S,1))+' px at this scale.','small')
txt(25,42,'Capture is not enough: preserve the release-to-shot corridor','title')
txt(25,74,'Measured old/C evidence plus one dimensioned concept. No new runtime source or dynamics. Units are model units, not CAD.','body')
txt(35,866,'1  Receiver and support change together','head')
for i,t in enumerate(['Pivot remains |X|1.40 / Z4.45; same bat, keys and force.', 'First C arc retained to (1.6925, 3.55). Concept connector joins', 'accepted-relative terminal at (1.3793, 4.0284); neck min |X|1.3510.', 'Heel rail |X|1.435. New heel anchor Z4.65; no post at Z4.10.', 'Inner stock remains |X|1.35 / Z2.75..3.35; end support moves to3.10.', 'OUT has its own smooth tail to (1.865,4.35), not a folded offset.']):txt(35,899+i*26,t,'body')
txt(805,866,'2  Reserve, limits and next gates','head')
for i,t in enumerate(['Old traces shifted outward .15 are NOT predicted new trajectories.', 'At first Z3.35 crossing: |X| ~.430..1.138 (left); inner stock', 'sampled clearance >= +.069. Sling / full-world clearance not certified.', 'Compare all36, quiet capture u, released u range and both end contacts.', 'Keep the fixed C save frame only for causal diagnosis; moving save', 'and coil bracket remain a separate completion gate. No adoption.']):txt(805,899+i*26,t,'body')
line(25,1070,1530,1070,'#bdcbd5')
txt(35,1105,'Budget <=500,000 and reference long bands remain hard gates; independent index cleanup is not a shape change.','body','#a23c3c')
txt(35,1140,'Reference is perspective artwork. The next outline is a design hypothesis, not a proven natural path or complete mechanism.','body')
txt(35,1180,'Sources: accepted c1; frozen C f956dcc1; saved36 departure analysis. Full dimensions, negative evidence and limits accompany this SVG.','small')
s.append('</svg>');(P/'receiver-release-plan.svg').write_text('\n'.join(s))
print(json.dumps({'proposalSampleMinAxisSeparation':minsep,'crossSections':width,'projectedOldInnerMinimum':min(x['sampleMinimumOldInnerRailAndEndShaftGap'] for x in reserve if x['mode']=='baseline'),'projectedOldNewAnchorMinimum':min(x['sampleMinimumProposedAnchorGap'] for x in reserve if x['mode']=='baseline'),'projectedOldConnectorMinimum':min(x['sampleMinimumConceptConnectorGap'] for x in reserve if x['mode']=='baseline'),'receiverStart':end,'receiverNeck':min(p[0] for p in tail),'anchorsPerSide':len(anchors)},indent=2))
