from pathlib import Path
import json,html,math
P=Path(__file__).parent;D=json.loads((P/'accepted-geometry.json').read_text())
C={'bg':'#f4f6fa','ink':'#152c41','muted':'#52687a','line':'#c9d3dd','blue':'#237cbb','teal':'#11998e','red':'#be4d49','gold':'#bc8e20','purple':'#8e5caa','pink':'#bb527d'}
def esc(s):return html.escape(str(s))
class SVG:
 def __init__(self,title,sub,num):
  self.a=[f'<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1300" viewBox="0 0 1600 1300"><style>text{{font-family:Arial,sans-serif;fill:{C["ink"]}}}.small{{font-size:17px}}.body{{font-size:21px}}.title{{font-size:34px;font-weight:700}}</style>',f'<rect width="1600" height="1300" fill="{C["bg"]}"/>'];self.text(35,53,title,'title');self.text(35,86,sub,'small');self.text(1550,53,str(num),'title','end')
 def add(self,s):self.a.append(s)
 def text(self,x,y,t,cl='body',anchor='start',fill=None):self.add(f'<text x="{x}" y="{y}" class="{cl}" text-anchor="{anchor}"'+(f' style="fill:{fill}"' if fill else '')+f'>{esc(t)}</text>')
 def lines(self,x,y,lines,size=21,gap=29,fill=None):
  for i,t in enumerate(lines):self.add(f'<text x="{x}" y="{y+i*gap}" style="font-size:{size}px;fill:{fill or C["ink"]}">{esc(t)}</text>')
 def box(self,x,y,w,h,title):
  self.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="16" fill="white" stroke="{C["line"]}"/>');self.text(x+20,y+35,title,'body')
 def line(self,x1,y1,x2,y2,color=None,w=2,dash=None):self.add(f'<path d="M{x1},{y1} L{x2},{y2}" fill="none" stroke="{color or C["line"]}" stroke-width="{w}"'+(f' stroke-dasharray="{dash}"' if dash else '')+'/>')
 def rect(self,x,y,w,h,fill,stroke=None):self.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}"'+(f' stroke="{stroke}"' if stroke else '')+'/>')
 def circle(self,x,y,r,fill,stroke=None,w=2,dash=None):self.add(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke or "none"}" stroke-width="{w}"'+(f' stroke-dasharray="{dash}"' if dash else '')+'/>')
 def poly(self,pts,fill='none',stroke=None,w=2,dash=None,close=True):
  self.add(f'<{"polygon" if close else "polyline"} points="'+ ' '.join(f'{x:.3f},{y:.3f}' for x,y in pts)+f'" fill="{fill}" stroke="{stroke or "none"}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round"'+(f' stroke-dasharray="{dash}"' if dash else '')+'/>')
 def dim(self,x1,y1,x2,y2,label,offset=-10):
  self.line(x1,y1,x2,y2,C['muted'],1.5);self.line(x1,y1-5,x1,y1+5,C['muted']);self.line(x2,y2-5,x2,y2+5,C['muted']);self.text((x1+x2)/2,(y1+y2)/2+offset,label,'small','middle')
 def save(self,name):
  self.text(35,1275,'SOURCE: accepted c1f7aeb at docs HEAD 4b3b4f0. Model units, not manufacturer dimensions. No new geometry or dynamic test.','small')
  self.add('</svg>');(P/name).write_text('\n'.join(self.a))
def plan(s,ox,oy,scale,z0,clip,details=False):
 x=lambda a:ox+a*scale;y=lambda z:oy+(z-z0)*scale
 s.add(f'<defs><clipPath id="{clip[0]}"><rect x="{clip[1]}" y="{clip[2]}" width="{clip[3]}" height="{clip[4]}"/></clipPath></defs><g clip-path="url(#{clip[0]})">')
 s.rect(x(-2.75),y(-5.75),5.5*scale,11.9*scale,'#edf2f5',C['ink'])
 for z in range(-5,7):s.line(x(-2.75),y(z),x(2.75),y(z),'#dce3e9',1)
 s.line(x(0),y(-5.75),x(0),y(6.15),'#cbd6e0',1,'4 6')
 for p in D['ramp']['lowBasePlan']:s.poly([(x(a),y(c)) for a,b,c in p],'#b5a0c6',None)
 nose=D['ramp']['nose'];s.poly([(x(nose[i][0]),y(nose[i][2])) for i in [0,2,4]],'#916aa6',C['purple'],1)
 for q in D['BUMPERS']:s.circle(x(q['x']),y(q['z']),.4*scale,'#e3c975',C['gold'])
 for b in D['TARGET_BANKS']:
  a=b['a'];bb=b['b'];s.line(x(a[0]),y(a[2]),x(bb[0]),y(bb[2]),'#c78557',.16*scale)
 for sh in D['sling']:
  s.poly([(x(a),y(b)) for a,b in sh['coverProjectionConvexHull']],'#bbd4e0','#3c647a',1)
  s.poly([(x(a),y(c)) for a,b,c in sh['contactCenterline']],'none',C['red'],.05*scale,close=False)
 for lane in D['lanes']:
  for i,path in enumerate(lane['paths']):s.poly([(x(a),y(c)) for a,b,c in path],'none',C['teal'] if i<2 else C['gold'],.04*scale,close=False)
  for a,b,c in lane['mounts']:s.circle(x(a),y(c),.065*scale,'none','#a87e25',1,'2 2')
 for f in D['flippers']:
  s.poly([(x(a),y(b)) for a,b in f['polygon']], 'none' if f['active'] else '#db97b4',C['pink'],1.5,'5 4' if f['active'] else None)
  if not f['active']:s.circle(x(f['pivot'][0]),y(f['pivot'][2]),.045*scale,'white',C['pink'])
 sh=D['shooter'];s.poly([(x(a),y(b)) for a,b in D['SHOOTER_BACKING']],'#aab8c5')
 s.poly([(x(a),y(c)) for a,b,c in sh['inner']],'none',C['blue'],.09*scale,close=False)
 s.line(x(2.72),y(-4.15),x(2.72),y(4.95),C['blue'],.12*scale)
 s.poly([(x(a),y(c)) for a,b,c in sh['roof']],'none',C['blue'],.12*scale,close=False)
 for a in sh['bars']:s.line(x(a),y(-5),x(a),y(-4.1),'#587b9e',.07*scale)
 for a in sh['sensors']:s.rect(x(a-.35),y(-4.63),.7*scale,.16*scale,'#c9e6c9')
 # Elevated route is intentionally translucent and distinguished from ground boundaries.
 rows=D['ramp']['sheet'];s.poly([(x(r['left'][0]),y(r['left'][2])) for r in rows]+[(x(r['right'][0]),y(r['right'][2])) for r in rows[::-1]],'#80c6e57a','#458aaa',1.5)
 for rail in D['ramp']['wire']:s.poly([(x(a),y(c)) for a,b,c in rail],'none','#477f95',.036*scale,close=False)
 for p in D['ramp']['supports']:
  s.circle(x(p['x']),y(p['z']),(.04 if p['divider'] else .085)*scale,'#e4d3a0','#8b773e',1)
  r=(D['ramp']['sheet']+[]);# saddle comes from sampled route; shaft datum alone shown.
  s.circle(x(p['x']),y(p['z']),.037*scale,'#617789')
 s.rect(x(-2.62),y(3.45),.54*scale,.27*scale,'#e8c06b77');s.line(x(-2.1),y(3.8),x(-2.1),y(3.5),C['gold'],.12*scale)
 s.circle(x(0),y(4.965),.17*scale,'#d7b15a',C['gold'])
 s.line(x(-2.75),y(5.05),x(2.3),y(5.05),C['red'],2,'7 5')
 s.circle(x(2.53),y(4.425),.135*scale,'#fff',C['blue'],2)
 s.add('</g>');return x,y
s=SVG('1  Accepted layout: scale, paths and relationships','ACTUAL geometry projection. Elevated parts overlap ground parts in this view; this is not a free-passage certificate.',1)
s.box(30,110,575,1125,'Full board: 5.50 x 11.90')
x,y=plan(s,320,170,81,-5.75,('full',55,155,525,1015))
s.dim(x(-2.75),y(-5.75)-16,x(2.75),y(-5.75)-16,'5.50')
for z in [-5,-3,-1,1,3,5]:s.text(66,y(z)+6,f'z {z}','small')
s.text(320,1159,'Blue: shooter / pale cyan: elevated route','small','middle')
s.text(320,1184,'Purple: low base + nose / red: sling rubber','small','middle')
s.text(320,1211,'Ground direction +Z / front','small','middle')
s.box(630,110,940,660,'Lower detail: actual broad sling, paired guides and bat sweep')
x,y=plan(s,1100,190,120,1.0,('lower',654,158,892,555),True)
s.circle(x(0),y(2.6),.135*120,'white',C['ink'],2);s.text(x(0),y(2.6)-29,'Ball diameter .270','small','middle')
s.text(x(-1.72)-12,y(3)-19,'Wire end','small','end');s.circle(x(-1.72),y(3),5,'white',C['blue'])
s.text(x(1.48),y(3.13),'IN','small','middle',C['teal']);s.text(x(2.12),y(3.13),'OUT','small','middle',C['gold'])
s.dim(x(-.2953468),y(5.13),x(.2953468),y(5.13),'.5907 projected rest gap',23)
s.text(654,739,'Solid bats: rest. Dashed bats: held. Gold dotted circles: visible cap envelopes, not full passage clearance.','small')
s.box(630,795,940,440,'What the comparison actually establishes')
s.lines(652,870,['MODEL: ball D .270; board is 20.37 balls wide and 44.07 balls long.',
'MODEL: sling rubber/contact reaches |x| 1.951968; broad cover is retained.',
'MODEL: straight triple-rail overlap z 3.00..3.35 = .350 = 1.30 ball diameters.',
'MODEL: printed IN/OUT lengths 1.10 / 1.70 = .647. Ink is not channel width.',
'MODEL: wire endpoint (-1.72, .44, 3.00); nominal supported center Y .575.'],21,35)
s.lines(652,1067,['REFERENCE (perspective estimate only): broad slings, a right S and left wire,',
'long near-parallel lower IN/OUT bands, readable hardware and a visible center gap.',
'Right band vertical-extent estimate IN/OUT ~1.1 (roughly .9..1.4).',
'The raised mouth may be an entry OR a return outlet. Image alone cannot decide.'],20,31)
s.lines(652,1208,['Reference ratio is not the same measurement as model ink length, and is not CAD.'],18,25,C['red'])
s.save('01-accepted-plan.svg')

s=SVG('2  Sections: conditional constraints, not universal impossibility','ACTUAL dimensions and explicit idealized calculations. Red means a failed condition; orange means a design assumption.',2)
s.box(30,110,755,520,'A  Lower width allocation beside the broad sling')
ax=95;scale=740
s.text(60,180,'Fixed plan envelope: sling outer 1.951968 to divider face 2.305','small')
s.rect(ax,220,.3530322*scale,44,'#a1cecc',C['teal']);s.dim(ax,216,ax+.3530322*scale,216,'.353032 available')
s.text(60,307,'Assumed target: .320 clear IN + .040 divider + .320 clear OUT','small')
s.rect(ax,335,.32*scale,45,'#cce7e3');s.rect(ax+.32*scale,335,.04*scale,45,'#607b89');s.rect(ax+.36*scale,335,.32*scale,45,'#f5ddb3')
for c in [.16,.52]:s.dim(ax+(c-.135)*scale,357,ax+(c+.135)*scale,357,'D .270',42)
s.line(ax+.3530322*scale,215,ax+.3530322*scale,463,C['red'],2,'7 5');s.dim(ax,469,ax+.68*scale,469,'.680 target; deficit .326968',25)
s.lines(60,530,['.320 = ball .270 + assumed .050 total spare, not a proven tolerance.',
'Even .270 + .040 + .270 needs .580 in this fixed PLAN allocation.',
'This rules out that allocation, not every 3D route or overall redesign.'],19,29)
s.box(815,110,755,520,'B  Shooter X-Y section: ground fit is not all-height fit')
cx=lambda x:880+(x-2.12)*660;cy=lambda y:400-y*660
s.rect(850,cy(.04),685,.18*660,'#d2dbe3')
s.circle(cx(2.35),cy(.23),.045*660,'#587e9a')
s.poly([(cx(a),cy(b)) for a,b in D['shooter']['outerSection']],'#587e9a',C['blue'],1)
s.circle(cx(2.53),cy(.175),.135*660,'#99c6e333',C['blue'],2)
s.circle(cx(2.53),cy(.23),.135*660,'none',C['red'],2,'6 5')
s.line(860,cy(.23),1465,cy(.23),'#839aaa',1,'3 4')
s.dim(cx(2.35),526,cx(2.72),526,'Axis separation .370')
s.text(1410,cy(.23)-12,'Y .230','small','end')
s.text(1500,cy(.04)-10,'Top .040','small','end')

s.lines(850,555,['Blue: floor-center .175. Red dashed: axis-height .230.',
'Ideal circles: axis-height gap .265 < D .270; floor-center interval ~.01152.',
'Accepted outer is OCTAGONAL. Round-stock change adds up to .004567.'],18,27)
s.box(30,660,755,570,'C  Mount height: visible board Y [-.140, +.040]')
Y=lambda v:1005-v*640
s.rect(65,Y(.04),680,.18*640,'#d2dbe3')
for label,xv in [('Accepted lower',170),('Rejected old foot',400),('Rejected upper mount',635)]:
 s.text(xv,742,label,'small','middle')
s.rect(170-.027*640,Y(.22),.054*640,.15*640,'#638398');s.rect(170-.065*640,Y(.2325),.13*640,.025*640,'#c5a046');s.rect(170-.055*640,Y(.0745),.11*640,.025*640,'#638398')
s.rect(400-.018*640,Y(.22),.036*640,.26*640,'#bd7770');s.rect(400-.045*640,Y(-.02),.09*640,.03*640,'#be4d49')
s.rect(635-.018*640,Y(.23),.036*640,.41*640,'#638398');s.rect(635-.05*640,Y(-.14),.10*640,.012*640,'#d9b553');s.rect(635-.032*640,Y(-.152),.064*640,.022*640,'#738a98')
s.lines(75,1144,['Old foot [-.050, -.020] is inside the board, not under it.',
'Upper washer [-.152, -.140] and shaft to -.180 reach the underside.',
'Accepted lower caps are visible .130-wide parts; no dedicated cap collider.',
'No drawing here certifies holes, load paths or whole-candidate acceptance.'],18,24)
s.box(815,660,755,570,'D  Coupled handoffs and outside-board support')
s.lines(845,735,['Wire end: (-1.72, .44, 3.00). Release direction and speed matter.',
'At the SAME XZ, rejected lower rail gaps were:',
' +.217768 at supported sphere-center Y .575; -.032706 at Y .175.',
'These two samples are a vertical column, NOT the flight trajectory.'],20,31)
s.line(900,900,1500,900,'#708b9d',2)
s.rect(1055,900,445,105,'#d2dbe3');s.text(1500,1033,'Board begins x -2.750','small','end')
s.rect(1002.8,835,44.4,191,'#bd7770');s.line(1047.2,865,1055,865,C['red'],3)
s.text(852,1073,'Old relocated shaft x -2.800, r .037 ends at x -2.763:','small')
s.text(852,1102,'a .013 lateral gap to the board. Longer shaft alone cannot attach.','small')
s.lines(845,1150,['OUT guide also shares the left earned-save region and firing axis.',
'Preserve real discharge; do not hide an exterior pocket with artwork.'],20,30)
s.save('02-sections.svg')

s=SVG('3  Whole-layout choices: concepts, not tested shapes','All three retain user-facing input/force behavior and must prove natural play plus equal-or-better continuous aim range.',3)
cards=[
('A  Keep the current play skeleton',45,C['teal'],['Keep current shooter / roof / nose / bats.',
'Preserve terminal heel and wire handoff.',
'Explore earlier coupled IN + OUT transition.',
'Mounts and outside collection stay in scope.'],['Base: tested play; reference incomplete.',
'Any new transition is still unproved.',
'Limit: no promise of reference-long lanes.',
'Unknown: IN arrival / wire / save axis.',
'Reject: cosmetic-only elongation.']),
('B  Redistribute width as one system',565,C['blue'],['Allocate width to both IN and OUT.',
'Co-design board, straight shooter and exit.',
'Include nose access, bars, sensors, supports.',
'Keep current bat / heel as a chosen baseline.'],['Section room may exist; route is unproved.',
'Cost: entrance and lower return are coupled.',
'Unknown: all-height connector + natural feed.',
'Reject: rigid roof shift / repeat R1.70 wedge.']),
('C  Replan the mechanical topology',1085,C['purple'],['Allow pivot / heel / drain locations to change.',
'First compare current bat length (~1.14).',
'Do not silently require old center opening.',
'Decide if raised mouth is entry or return.'],['Layout freedom, not proven viability.',
'Cost: save, difficulty, capture and aim requalify.',
'If mouth returns: another natural ascent needed.',
'No portal, hidden floor or automatic rescue.'])]
for title,x,col,a,b in cards:
 s.box(x,115,470,680,title);s.rect(x+20,172,430,7,col)
 s.lines(x+22,220,a,19,31)
 # Relationship diagram, expressly schematic.
 s.rect(x+50,365,370,164,'#eef3f7',C['line'])
 s.line(x+88,382,x+88,511,col,8);s.line(x+382,382,x+382,511,col,8)
 s.poly([(x+130,398),(x+166,454),(x+112,467)],'#bbd4e0',C['red'],2)
 s.poly([(x+340,398),(x+304,454),(x+358,467)],'#bbd4e0',C['red'],2)
 spread=30 if title.startswith('C') else 0
 s.line(x+158-spread,490,x+213-spread,515,C['pink'],14);s.line(x+312+spread,490,x+257+spread,515,C['pink'],14)
 s.text(x+235,562,'RELATIONSHIP SKETCH / NOT TO SCALE','small','middle')
 s.lines(x+22,615,b,18,32)
s.box(45,825,1510,392,'Fixed outcomes vs selectable geometry')
s.lines(68,891,['MUST KEEP: keyboard/touch semantics, force contract, natural weak/medium/strong feed, real IN capture then release/repress refire,',
'OUT drain and earned kickback, shared visible/contact boundaries, equal-or-better continuous aim coverage, reference quality and mobile.'],20,31)
s.lines(68,974,['NOT absolute user constraints: old pivot X/Z, exact center gap, board width/length, old shooter axis, or the reference mouth being an entry.',
'Illustration only: each pivot +.400 outward with the SAME bat/angle increases projected rest gap .590694 -> 1.390694.',
'The older ~1.625 bat calculation additionally FIXED the old opening; it is not a required bat length or an impossibility proof.'],20,31)
s.lines(68,1084,['FIRST DECISION: choose route topology and which datums may move. No concept is qualified for adoption by this sheet.',
'Then: shared all-height corridor + reference views -> six natural powers / weak return -> IN capture/refire + OUT save ->',
'strong shots + original aim matrix -> full regression / controller games -> real phone and human play. Preserve every failed assertion.'],20,31)
s.text(68,1197,'No independent geometry improvement is currently qualified for adoption. A useful proposal is evidence/diagram tooling, not a cosmetic patch.','small',fill=C['red'])
s.save('03-whole-layout-options.svg')
# Standalone SVG pages, no external assets or network.
svgs=[(P/n).read_text() for n in ['01-accepted-plan.svg','02-sections.svg','03-whole-layout-options.svg']]
(P/'constraints.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><title>Pinball layout constraints</title><style>@page{size:1600px 1300px;margin:0}*{box-sizing:border-box}body{margin:0;background:#dfe5ec}section{width:1600px;height:1300px;break-after:page;page-break-after:always}section:last-child{break-after:auto}svg{display:block;width:1600px;height:1300px}</style>'+''.join('<section>'+x+'</section>' for x in svgs)+'</html>')
print('Wrote three SVG sheets and standalone HTML.')
