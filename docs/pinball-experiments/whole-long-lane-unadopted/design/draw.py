from pathlib import Path
import json,math,html,base64,hashlib
R=Path.cwd();P=R/'artifacts/pinball/whole-long-lane-plan-891ae62';D=json.loads((R/'docs/pinball-experiments/whole-layout-constraints-4b3b4f0/accepted-geometry.json').read_text())
A=['<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1320" viewBox="0 0 1800 1320"><style>text{font-family:Arial,sans-serif;fill:#17334b;font-size:19px} .title{font-size:31px;font-weight:700}.head{font-size:23px;font-weight:700}.small{font-size:17px}</style><rect width="1800" height="1320" fill="#f5f7fa"/>']
def add(s):A.append(s)
def text(x,y,t,cl='',color=None,anchor='start'):
 add(f'<text x="{x}" y="{y}" class="{cl}" text-anchor="{anchor}"'+(f' style="fill:{color}"' if color else '')+f'>{html.escape(t)}</text>')
def rect(x,y,w,h,c,stroke='none',dash=None):add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{c}" stroke="{stroke}"'+(f' stroke-dasharray="{dash}"' if dash else '')+'/>')
def line(p,c,w=2,dash=None,fill='none',closed=False):add(f'<{"polygon" if closed else "polyline"} points="'+ ' '.join(f'{x:.4f},{y:.4f}' for x,y in p)+f'" fill="{fill}" stroke="{c}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round"'+(f' stroke-dasharray="{dash}"' if dash else '')+'/>')
def circle(x,y,r,c,stroke='none',w=1):add(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}" stroke="{stroke}" stroke-width="{w}"/>')
def words(x,y,a,color=None):
 for i,t in enumerate(a):text(x,y+27*i,t,'small',color)
text(30,47,'Long-lane whole-layout concept: dimensions before implementation','title')
text(30,81,'Only accepted and proposed plans share a physical scale (68 px / model unit). Reference is perspective artwork, NOT CAD.','small')
for bx,w in [(25,480),(525,590),(1135,640)]:rect(bx,110,w,1160,'white','#cbd6df')
text(45,148,'Reference: qualitative relationships','head');text(545,148,'Accepted runtime 8849609','head');text(1155,148,'One proposed layout: NOT qualified','head')
ref=base64.b64encode((R/'artifacts/pinball/neon-reference.png').read_bytes()).decode();add(f'<image x="45" y="176" width="440" height="586" href="data:image/png;base64,{ref}"/>')
words(45,800,['Long, near-parallel IN / OUT bands.','Broad slings above the lower lanes.','Shooter is outside the right lane.','Bat roots sit inside the lane mouths.','Artwork does not define real rail sections,','clearances, flow direction or support loads.'])
words(45,995,['New plan changes WHOLE proportions:','width 5.50 → 6.50 (+18.2%)','length 11.90 → 12.65 (+6.3%)','L/W 2.164 → 1.946 (less slender)','Board center X +.40; upper play stays X0.','Asymmetric right reserve is conspicuous.'], '#8e5223')
words(45,1190,['No source map, collider or dynamics is made.','Dashed orange regions are unresolved.'], '#b83d3d')
S=68;Z0=-5.75;OY=184
for proposal,OX in [(False,810),(True,1420)]:
 X=lambda x:OX+x*S;Y=lambda z:OY+(z-Z0)*S
 a,b,f=(-2.85,3.65,6.90) if proposal else (-2.75,2.75,6.15)
 rect(X(a),Y(Z0),(b-a)*S,(f-Z0)*S,'#eef3f7','#1b3547')
 for z in range(-5,7):line([(X(a),Y(z)),(X(b),Y(z))],'#dce4eb',1)
 line([(X(0),Y(Z0)),(X(0),Y(f))],'#bac9d7',1,'5 5')
 if proposal:line([(X(.4),Y(Z0)),(X(.4),Y(f))],'#ca9468',1,'5 5')
 for p in D['ramp']['lowBasePlan']:line([(X(x),Y(z)) for x,y,z in p],'none',fill='#bba8cb',closed=True)
 for q in D['BUMPERS']:circle(X(q['x']),Y(q['z']),.4*S,'#ecd17a','#be982e')
 for bank in D['TARGET_BANKS']:line([(X(bank['a'][0]),Y(bank['a'][2])),(X(bank['b'][0]),Y(bank['b'][2]))],'#bf794d',.16*S)
 for sling in D['sling']:
  line([(X(x),Y(z)) for x,z in sling['coverProjectionConvexHull']],'#557c92',1,fill='#bed6e2',closed=True)
  line([(X(x),Y(z)) for x,y,z in sling['contactCenterline']],'#ba4d49',.05*S)
 for q in D['ramp']['supports']:
  x=q['x']-.10 if proposal and q['x']==-2.65 else q['x'];circle(X(x),Y(q['z']),(.04 if q['divider'] else .085)*S,'#d7bc74','#897549');circle(X(x),Y(q['z']),.037*S,'#637d89')
 rows=D['ramp']['sheet'];line([(X(r['left'][0]),Y(r['left'][2])) for r in rows]+[(X(r['right'][0]),Y(r['right'][2])) for r in rows[::-1]],'#4a9cbb',1,fill='#91d4eb77',closed=True)
 for path in D['ramp']['wire']:line([(X(x),Y(z)) for x,y,z in path],'#45859d',.036*S)
 # Same roof/bars/sensors. The lower connector transition is not silently part of these lines.
 line([(X(x),Y(z)) for x,y,z in D['shooter']['roof']],'#207cb7',.12*S)
 for x in D['shooter']['bars']:line([(X(x),Y(-5)),(X(x),Y(-4.1))],'#587a95',.07*S)
 for x in D['shooter']['sensors']:rect(X(x-.35),Y(-4.63),.7*S,.16*S,'#cce4ce')
 if not proposal:
  for lane in D['lanes']:
   for k,path in enumerate(lane['paths']):line([(X(x),Y(z)) for x,y,z in path],['#16877c','#16877c','#b28a25'][k],.04*S)
  line([(X(2.35),Y(5.9)),(X(2.35),Y(-3.9))],'#207cb7',.09*S);line([(X(2.72),Y(4.95)),(X(2.72),Y(-4.15))],'#207cb7',.12*S)
 else:
  nx,nz=3/math.sqrt(10),1/math.sqrt(10)
  for side in [-1,1]:
   for off,c in [(-.43,'#16877c'),(0,'#16877c'),(.43,'#b28a25')]:
    pts=[(side*(1.9+off*nx),3+off*nz),(side*(1.35+off*nx),4.65+off*nz)]
    line([(X(x),Y(z)) for x,z in pts],c,.04*S)
   for off,c in [(-.215,'#a8ddd1'),(.215,'#efd48d')]:
    pts=[(side*(1.9+off*nx),3+off*nz),(side*(1.35+off*nx),4.65+off*nz)];line([(X(x),Y(z)) for x,z in pts],c,.29*S)
   rect(X(-1.95 if side<0 else .75),Y(4.58),1.2*S,.90*S,'#f9d3a344','#d2954c','4 4')
   line([(X(side*2.33),Y(1.35)),(X(side*(1.9+.43*nx)),Y(3+.43*nz))],'#b28a25',.04*S,'5 4')
  # S-shaped connector with radius 8.2, shift .4 over longitudinal run3.6.
  R8=(3.6**2+.4**2)/(4*.4);alpha=2*math.atan(.4/3.6);inner=[];outer=[]
  for i in range(97):
   t=i/48
   if t<=1:ang=t*alpha;x=2.75-R8*(1-math.cos(ang));z=.5-R8*math.sin(ang)
   else:ang=(2-t)*alpha;x=2.75-R8*(1-math.cos(alpha))-R8*(math.cos(ang)-math.cos(alpha));z=.5-R8*math.sin(alpha)-R8*(math.sin(alpha)-math.sin(ang))
   inner.append((X(x),Y(z)));outer.append((X(x+.455*math.cos(ang)),Y(z-.455*math.sin(ang))))
  line([(X(2.75),Y(5.9)),(X(2.75),Y(.5))]+inner,'#207cb7',.09*S)
  line([(X(3.205),Y(5.70)),(X(3.205),Y(.5))]+outer,'#207cb7',.12*S)
  line([(X(2.35),Y(-3.1)),(X(2.35),Y(-3.9))],'#207cb7',.09*S)
  line([(X(2.805),Y(-3.1)),(X(2.72),Y(-4.15))],'#c58332',.12*S,'5 4')
  text(X(3.60),Y(-1),'outer','small','#8e5223','end');text(X(3.60),Y(-.66)) if False else None
  text(X(3.60),Y(-.66),'reserve','small','#8e5223','end')
 # Robot is an actual accepted INK extent, not an obstacle.
 rect(X(-1.358887),Y(-.47168),(1.477051+1.358887)*S,(2.122559+.47168)*S,'#90a4ae20','#a2b1bd')
 text(X(0),Y(.75),'ROBOT INK','small',anchor='middle');circle(X(0),Y(2.92),.34*S,'#efd376bb','#b28a25');text(X(0),Y(2.92)+5,'MISSION','small',anchor='middle');rect(X(-.7),Y(3.49),1.4*S,.22*S,'#b4d5dc');text(X(0),Y(3.60)+5,'M1 – M5','small',anchor='middle')
 dx,dz=(.10,.75) if proposal else (0,0)
 for fl in D['flippers']:
  px,pz=fl['pivot'][0],fl['pivot'][2];sd=fl['side']
  if not fl['active']:
   # Visual sample of the actual contact profile sweep, not a clearance certificate.
   for j in range(19):
    ang=(-sd)*1.08*j/18;co,si=math.cos(ang),math.sin(ang)
    pts=[(X(px+sd*dx+(x-px)*co+(z-pz)*si),Y(pz+dz-(x-px)*si+(z-pz)*co)) for x,z in fl['polygon']]
    line(pts,'none',fill='#c877a012',closed=True)
  line([(X(x+sd*dx),Y(z+dz)) for x,z in fl['polygon']],'#aa4d7c',1.2,'4 4' if fl['active'] else None, 'none' if fl['active'] else '#dfb3ca',True)
  if not fl['active']:circle(X(px+sd*dx),Y(pz+dz),.045*S,'white','#aa4d7c');text(X(0),Y(pz+dz)-15,'PIVOTS','small',anchor='middle')
 drain=5.05+dz;line([(X(a),Y(drain)),(X(b-.4),Y(drain))],'#c94a44',2,'6 5');text(X(0),Y(drain)+22,f'drain Z {drain:.2f}','small','#c94a44','middle')
 # Explicit rod rear installation extends, head stays at old Z.
 sx=2.93 if proposal else 2.53;extra=.75 if proposal else 0
 line([(X(sx),Y(4.64)),(X(sx),Y(5.79+extra))],'#5c6971',.068*S)
 line([(X(sx),Y(4.72)),(X(sx),Y(5.39+extra))],'#a89153',.142*S)
 line([(X(sx),Y(5.414+extra)),(X(sx),Y(5.594+extra))],'#5c6971',.148*S)
 circle(X(sx),Y(5.80+extra),.16*S,'#bba359','#605638');circle(X(sx),Y(6.12+extra),.16*S,'none','#bb6e35')
 circle(X(sx),Y(4.425),.135*S,'white','#207cb7',2)
 text(X(sx)+12,Y(4.425)+5,'stop','small','#207cb7')
 circle(X(-1.72),Y(3),.135*S,'#ffffffaa','#45859d',1);line([(X(-.15),Y(3)),(X(-.15),Y(4.45+dz))],'#7e7e7e',1,'4 5')
 text(X(0),Y(3.98+dz/2),f'ΔZ {1.45+dz:.2f}','small','#5f6e79','middle')
 text(X((a+b)/2),Y(-5.75)-10,f'W {b-a:.2f}  /  L {f+5.75:.2f}','small',anchor='middle')
 text(X(0),Y(f)+24,f'front Z {f:.2f}','small',anchor='middle')
 if proposal:
  words(1155,1090,['Straight lane axes length 1.739; tilt 18.435°.','.430 NORMAL axis pitch → .390 clear stock gap.','Pivot X ±1.35 / Z5.20; same 1.14 bat.','Rest projected gap .7907 (old .5907).','Dashed heel / upper joins / SAVE are unresolved.','New rod: rest tip6.63 / full-pull tip6.95.'], '#8e5223')
 else:
  words(545,1090,['Actual geometry; profile sweep is projected.','Tested play, but reference / mesh defects remain.','Wire Z3 → pivot Z4.45: ΔZ1.45.','Sling lower end2.65 → pivot4.45: ΔZ1.80.','New plan increases this distance to2.55 (+41.7%).','Old rod: rest tip5.88 / full-pull tip6.20.'])
text(30,1300,'READING LIMIT: top-down overlap is not collision. No all-height sphere, support, whole-bat sweep or natural-launch qualification yet.','small','#b83d3d')
add('</svg>');svg='\n'.join(A);(P/'same-scale-comparison.svg').write_text(svg);(P/'comparison.html').write_text('<!doctype html><meta charset="utf-8"><style>body{margin:0}svg{display:block}</style>'+svg)
dims={'status':'Concept only; no runtime geometry or source freeze','baseHEAD':'891ae621f7d822dcb2c3d66ea1247fa4f4c97bb5','runtime':'884960985a413986d57aff0c2280e59a7be79dcf','board':{'left':-2.85,'right':3.65,'rear':-5.75,'front':6.9,'width':6.5,'length':12.65,'centerX':.4,'centerZ':.575},'ballDiameter':.27,'pivot':[1.35,.27,5.2],'batLength':1.14,'laneMain':{'dividerStart':[1.9,.22,3],'dividerEnd':[1.35,.22,4.65],'normalAxisOffset':.43,'railRadius':.02,'length':math.hypot(.55,1.65),'tangentDegrees':math.degrees(math.atan(.55/1.65)),'straightSolidGap':.39,'receiverAndTail':'NOT FIXED'},'upperConnector':{'innerStart':[2.75,.23,.5],'innerEnd':[2.35,.23,-3.1],'shift':.4,'run':3.6,'innerAxisRadius':8.2,'normalAxisOffset':.455,'innerRadius':.045,'outerRadius':.06,'nominalSolidGap':.35,'roofJoin':'UNRESOLVED'},'shooter':{'x':2.93,'restZ':4.6,'ballZ':4.425,'pullTravel':.32,'proposedRearSeat':6.14,'guideStart':6.164,'guideEnd':6.344,'knobOriginRest':6.45,'knobRestEnd':6.63,'knobPulledEnd':6.95,'springFront':4.72,'springLengthRest':1.42,'caution':'Longer spring/rod installation is geometric concept; current input/force contract unchanged. Actual front mounting/cutout and ball swept clearance not verified.'},'leftSupport':{'postColumnX':-2.75,'shaftRadius':.037,'footRadius':.085,'footEdgeToBoard':.015,'crossHeads':'Must reconnect actual wire, not yet specified'},'unknowns':['Receiver rail normal and whole bat body sweep','OUT tail + finite earned-save positioning','Wire full-height arrival','Outer reachable region including rail supports and upper joint','Actual shooter extension/front cutout/cabinet contact','Reference composition and mobile readability','Natural6power/weak/IN36/continuousaim/naturalwire/full202/natural54']}
(P/'dimensions.json').write_text(json.dumps(dims,indent=2)+'\n')
print(P)
