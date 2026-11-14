from pathlib import Path
import json,math,html,base64,hashlib
R=Path.cwd();P=R/'artifacts/pinball/whole-long-lane-plan-891ae62';D=json.loads((R/'docs/pinball-experiments/whole-layout-constraints-4b3b4f0/accepted-geometry.json').read_text())
N=json.loads((P/'side-start-dimensions.json').read_text())
A=['<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1320" viewBox="0 0 1800 1320"><style>text{font-family:Arial,sans-serif;fill:#17334b;font-size:19px} .title{font-size:31px;font-weight:700}.head{font-size:23px;font-weight:700}.small{font-size:17px}</style><rect width="1800" height="1320" fill="#f5f7fa"/>']
def add(s):A.append(s)
def text(x,y,t,cl='',color=None,anchor='start'):
 add(f'<text x="{x}" y="{y}" class="{cl}" text-anchor="{anchor}"'+(f' style="fill:{color}"' if color else '')+f'>{html.escape(t)}</text>')
def rect(x,y,w,h,c,stroke='none',dash=None):add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{c}" stroke="{stroke}"'+(f' stroke-dasharray="{dash}"' if dash else '')+'/>')
def line(p,c,w=2,dash=None,fill='none',closed=False):add(f'<{"polygon" if closed else "polyline"} points="'+ ' '.join(f'{x:.4f},{y:.4f}' for x,y in p)+f'" fill="{fill}" stroke="{c}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round"'+(f' stroke-dasharray="{dash}"' if dash else '')+'/>')
def circle(x,y,r,c,stroke='none',w=1):add(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}" stroke="{stroke}" stroke-width="{w}"/>')
def words(x,y,a,color=None):
 for i,t in enumerate(a):text(x,y+27*i,t,'small',color)
text(30,47,'Exterior structure: two scope choices, one provisional selection','title')
text(30,81,'Only accepted and proposed plans share a physical scale (68 px / model unit). Reference is perspective artwork, NOT CAD.','small')
for bx,w in [(25,480),(525,590),(1135,640)]:rect(bx,110,w,1160,'white','#cbd6df')
text(45,148,'Reference: qualitative relationships','head');text(545,148,'B: replace exterior with cabinet','head');text(1155,148,'A: widen for a real exterior path','head')
ref=base64.b64encode((R/'artifacts/pinball/neon-reference.png').read_bytes()).decode();add(f'<image x="45" y="176" width="440" height="586" href="data:image/png;base64,{ref}"/>')
words(45,800,['Long, near-parallel IN / OUT bands.','Broad slings above the lower lanes.','Shooter is outside the right lane.','Bat roots sit inside the lane mouths.','Artwork does not define real rail sections,','clearances, flow direction or support loads.'])
words(45,995,['Same side-start lanes / pivot / bat in A and B.','A: width6.88, L/W1.730, centerX+.21.','B: width6.50, L/W1.831, centerX+.40.','No hidden floor strip is accepted as safe.','Reference is qualitative, not a CAD template.','Neither option has dynamic qualification.'], '#8e5223')
words(45,1190,['No source map, collider or dynamics is made.','Dashed orange regions are unresolved.'], '#b83d3d')
S=68;Z0=-5.75;OY=184
for proposal,OX in [(True,810),(True,1420)]:
 wide=OX>1000
 X=lambda x:OX+x*S;Y=lambda z:OY+(z-Z0)*S
 a,b,f=(-3.23 if wide else -2.85,3.65,6.15) if proposal else (-2.75,2.75,6.15)
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
  x=(-3.12 if wide else -2.75) if q['x']==-2.65 else q['x'];circle(X(x),Y(q['z']),(.04 if q['divider'] else .085)*S,'#d7bc74','#897549');circle(X(x),Y(q['z']),.037*S,'#637d89')
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
  frames=N['lane']['frames']
  for side in [-1,1]:
   for off,c in [(0,'#16877c'),(.43,'#b28a25')]:
    pts=[(side*(2.3+off),1.35),(side*(2.3+off),2.45)]+[(side*(f['p'][0]+off*f['n'][0]),f['p'][2]+off*f['n'][2]) for f in frames]
    line([(X(x),Y(z)) for x,z in pts],c,.04*S)
   # IN upper inboard boundary is the actual sling, not an invented overlapping rail.
   pts=[(side*(f['p'][0]-.43*f['n'][0]),f['p'][2]-.43*f['n'][2]) for f in frames if 2.75<=f['p'][2]-.43*f['n'][2]<=3.20]
   line([(X(x),Y(z)) for x,z in pts],'#16877c',.04*S,'4 3')
   for off,c in [(-.215,'#a8ddd1'),(.215,'#efd48d')]:
    pts=[(side*(2.3+off),1.35),(side*(2.3+off),2.45)]+[(side*(f['p'][0]+off*f['n'][0]),f['p'][2]+off*f['n'][2]) for f in frames]
    line([(X(x),Y(z)) for x,z in pts],c,.29*S)
   rect(X(-2.65 if side<0 else 1.20),Y(3.92),1.45*S,1.0*S,'#f9d3a344','#d2954c','4 4')
   circle(X(-3.12 if wide and side<0 else side*2.75),Y(3),.17*S,'none','#31836a' if wide and side<0 else '#cf534c',2)
  if not wide:
   outer=[(-2.73,1.35),(-2.73,2.45)]+[(-(f['p'][0]+.43*f['n'][0]),f['p'][2]+.43*f['n'][2]) for f in frames]
   zone=outer+[(-2.85,outer[-1][1]),(-2.85,1.35)]
   line([(X(x),Y(z)) for x,z in zone],'#ad7b49',1,'4 4', '#a68b6a99',True)
   text(X(-2.63),Y(.75),'replacement','small','#8e5223','middle');text(X(-2.63),Y(1.08),'zone only','small','#8e5223','middle')
  else:
   line([(X(-3.12),Y(3)),(X(-2.75),Y(3))],'#398a72',2)
  circle(X(-2.06),Y(2.75),.135*S,'#ffffffcc','#c58332',2)
  line([(X(-2.40),Y(1.30)),(X(-2.06),Y(2.75))],'#c58332',2,'5 4')
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
 dx,dz=(0,0)
 for fl in (N['flippers'] if proposal else D['flippers']):
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
 sx=2.93 if proposal else 2.53;extra=0
 line([(X(sx),Y(4.64)),(X(sx),Y(5.79+extra))],'#5c6971',.068*S)
 line([(X(sx),Y(4.72)),(X(sx),Y(5.39+extra))],'#a89153',.142*S)
 line([(X(sx),Y(5.414+extra)),(X(sx),Y(5.594+extra))],'#5c6971',.148*S)
 circle(X(sx),Y(5.80+extra),.16*S,'#bba359','#605638');circle(X(sx),Y(6.12+extra),.16*S,'none','#bb6e35')
 circle(X(sx),Y(4.425),.135*S,'white','#207cb7',2)
 text(X(sx)+12,Y(4.425)+5,'stop','small','#207cb7')
 circle(X(-1.72),Y(3),.135*S,'#ffffffaa','#45859d',1);line([(X(-.15),Y(3)),(X(-.15),Y(4.45+dz))],'#7e7e7e',1,'4 5')
 None # pivot Z appears in dimension notes, avoid label overlap
 text(X((a+b)/2),Y(-5.75)-10,f'W {b-a:.2f}  /  L {f+5.75:.2f}','small',anchor='middle')
 text(X(0),Y(f)+24,f'front Z {f:.2f}','small',anchor='middle')
 if wide:
  words(1155,1090,['SELECT A for static assembly, not adoption.','Board left -3.23; column -3.12; total W6.88.','Straight stock/post solid gap .333 (D.270).','Foot r.085 leaves .025 to board edge.','Long crossheads / wire descent still unproved.','Upper right reserve and broad silhouette remain.'], '#8e5223')
 else:
  words(545,1090,['NOT SELECTED: a thin guard is insufficient.','A full cabinet / upper-to-lower boundary is needed.','Brown zone is required replacement area, NOT wall.','Keep no narrow floor slot accessible from above.','Top surface, load path and exits are undesigned.','Do not implement this as a crude sealed wedge.'], '#8e5223')
text(30,1300,'READING LIMIT: top-down overlap is not collision. No all-height sphere, support, whole-bat sweep or natural-launch qualification yet.','small','#b83d3d')
add('</svg>');svg='\n'.join(A);(P/'exterior-choice.svg').write_text(svg);(P/'exterior-choice.html').write_text('<!doctype html><meta charset="utf-8"><style>body{margin:0}svg{display:block}</style>'+svg)
print(P/'exterior-choice.svg')
