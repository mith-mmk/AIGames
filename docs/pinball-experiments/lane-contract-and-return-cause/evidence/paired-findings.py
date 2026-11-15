import json,math,hashlib
from pathlib import Path
p=Path(__file__).parent
findings=[]
for family in ['lower','physics']:
 for mode in ['baseline','candidate']:
  d=json.loads((p/f'{mode}-{family}-81.json').read_text());exit=next(r['tick']for r in d['rows']if r['after']['ramp']);seen=set();contacts=[]
  for r in d['rows']:
   if r['tick']<exit:continue
   for c in r['contacts']:
    o=d['descriptors'][c['id']];imp=sum(v['impulse']for v in c['points'])
    if c['id']==0 or imp<.001 or c['id']in seen:continue
    seen.add(c['id']);contacts.append({'tick':r['tick'],'sinceExit':r['tick']-exit,'object':o,'normal':c['normal'],'normalConvention':'Rapier manifold normal with original flipped flag; not manually reoriented','flipped':c['flipped'],'normalImpulse':imp,'before':r['before'],'after':r['after']})
   if len(contacts)>=6:break
  findings.append({'family':family,'mode':mode,'delay':81,'exitTick':exit,'exit':d['rows'][exit]['after'],'firstDistinctContacts':contacts,'checkpoint':d['checkpoint'],'final':d['final'],'resets':d['resets'],'rescues':d['rescues']})
a=json.loads((p/'baseline-lower-81.json').read_text());b=json.loads((p/'candidate-lower-81.json').read_text());first=next(i for i,(x,y)in enumerate(zip(a['rows'],b['rows']))if any(x['after'][k]!=y['after'][k]for k in ['p','v','w']));q=b['rows'][first]['before']['p'];rho=math.hypot(q[0]+1.7410209957213656,q[2]-3.778770245989578);gap=math.hypot(max(0,rho-.04),max(.20-q[1],0,q[1]-.24))-.135
result={'firstInitialCaptureDifference':{'tick':first,'beforeStatesExactlyEqual':a['rows'][first]['before']==b['rows'][first]['before'],'newJoinSocketFiniteCylinderSphereGapBefore':gap,'before':a['rows'][first]['before'],'baselineAfter':a['rows'][first]['after'],'candidateAfter':b['rows'][first]['after'],'warning':'Poststep manifold at this tick reports floor only. Socket-specific impulse/CCD processing at this first tick was not observed; do not invent it.'},'representative81':findings}
(p/'findings.json').write_text(json.dumps(result,indent=2)+'\n')
readme='''# Left lane ramp-return cause study — no geometry change

Frozen candidate07a6cbc5fc9d4dce4ea1d40d859340c6b56c63e52a16d09fc9dc9380da9d9607 versus pinned c87f117 sources. All outputs in this directory; no production/docs/source/expectation edits. Four fresh processes: baseline/candidate × lower/physics. Each creates five worlds in the same80→84 order. Each uses the original target fixture start, gravity, solver, force and held/release controller, including physics30tick boot. Original legal initial gap+.005000001 for every case. No extra natural trial was needed to identify an actual changed contact.

## Reproduction

node --import ./artifacts/pinball/left-lane-prototype-c87f117/v2-frame192-240/baseline-loader.mjs artifacts/pinball/left-lane-cause-dc4d13b/trace.mjs baseline lower
node --import ./artifacts/pinball/left-lane-prototype-c87f117/v2-frame192-240/loader.mjs artifacts/pinball/left-lane-cause-dc4d13b/trace.mjs candidate lower
Repeat with physics instead of lower. Then run compare.py and findings.py. Failed initial parser logs are preserved; no world executed in those attempts. Runtime source hashes are unchanged.

## Controlled-order outcomes, not a replacement for the raw212 gate

Lower family: baseline delays81–84 ramp+recapture; delay80 recaptures but0ramps. Candidate80/83 ramp+recapture,81/82 ramp then drain,84drain with0ramps. Physics family: baseline allfive ramp+recapture; candidate81 ramp then drain, otherfour recapture. Both variants receive the same case/world creation order. This is a standardized targeted comparison, NOT replay of all earlier tests in the original file. In particular baseline lower80 differs from the full accepted regression context. Creation/history sensitivity is retained as a limitation; fixed inputs alone are not a determinism guarantee.

## First divergence is before the ramp, not only after its exit

Lower81 rows0–43 have exactly identical p/v/spin. Beforecapturetick44 both at(−1.600000024,.170725629,3.684303761),v(0,.000005731,3.187376976),spin(23.9819908,0,0). New join socket at(−1.741020996,.22,3.778770246),radius.040,Y.20..24 has independently calculated finite-cylinder spheregap−.002000687 at this state. The candidate thereafter differs byposition.000762573 andvelocity.002858806. The poststep contact record at this precise first-difference tick only contains the floor, so a socket impulse/CCD event was NOT measured there. The changed socket is a geometrically plausible early interaction; do not claim an observed solver impulse at that tick or a specific internal engine bug.

The resulting cradle difference is small(.000117823 in lower81), but firstshot speed changes31.71988437→31.72591511, vx17.94508248→17.95901074. The ramp-exit ticks become1117→1154 and exit velocity changes from(.366039,−1.301397,2.618361) to(.387221,−1.626988,2.793061). These already-different incoming states mean the return comparison is not a same-exit-state counterfactual.

## Directly observed return mechanism, lower81

Baseline first lower-guide contact: tick1143, unchanged diagonal tail capsule centered(−1.485168576,.22,3.903576374),r.020. Normal(.411955,−.342198,−.844508), summed normal impulse.343827188. Velocity(.630728,approximately0,3.525921)→(2.190297,.000361,−.008750).

Candidate instead first hits the NEW join socket at tick1177, center(−1.741021037,.22,3.778770208),r.040/halfheight.020. Normal(.857742,−.204533,−.471641), summed normal impulse.173054382. Velocity(.668334,−.101429,3.753598)→(2.214582,.000023,2.494678). Nexttick1178 hits the old diagonal rail, impulse.153799608, leaving(2.882693,−.000031, .935536). Thus retaining the old tail23points did not preserve the local collision union or order: the new socket supplies an extra differently oriented contact before that unchanged rail.

At first left-bat return contact baseline velocity(2.104915,approximately0,1.364881),impulse.201677710; candidate(2.747357,.000003,1.421346),impulse.226507306. Candidate slides toward the tip/center rather than settling into the old cradle, later touches rightbat and drains at tick1379. Baseline settles and refires. The raw trace retains all contacts, normals, impulse values, velocities, spins and phase transitions. Reported normals use Rapier manifold convention with flippedflag stored, not an invented ball-outward reorientation.

## Independent fixture family corroboration

Physics81 candidate also hits this socket after its wire exit: tick1163, impulse.163873777, v(.707019,approximately0,3.631542)→(2.168001,.000030,2.439981), then reaches leftbat withvx2.709535 versusbaseline2.201390 and drains instead ofcradling. Physics cases81–84 show a tinyboot velocity difference1.90735e−6 at tick1 before the restoredfixture; do not hide that history/precision difference or attribute every later difference solely to the socket.

## Conclusion and unresolved causality

The new exposed join socket is a measured additional return contact with a substantial different horizontal response, and the whole approach reaches the same tail with changed p/v/spin. This explains a concrete failure mechanism in the two representative81fixtures. It does NOT establish that removing/shrinking the socket fixes the game; no such geometry was tried. No exactsame-exit restore/counterfactual was run, so shape effect versus already altered incoming state is not fully separated. Global collider-count/order changes and ordinary Rapier sensitivity remain potential contributing factors, not a diagnosed engine defect.

No inference that onefixture explains all natural54 loss61→15. The full212 twofunctional failures remain unresolved; alternative delay success does not waive them. No human/physicalphone claim. The parent may choose a narrowly approved further control, but this study introduces no new geometry.
'''
(p/'README.md').write_text(readme)
(p/'manifest.json').write_text(json.dumps({f.name:hashlib.sha256(f.read_bytes()).hexdigest()for f in sorted(p.iterdir())if f.is_file()and f.name!='manifest.json'},indent=2)+'\n')
