from pathlib import Path
import json,gzip,hashlib,shutil,sys
p=Path(__file__).resolve().parent;root=p.parents[2];h=lambda b:hashlib.sha256(b).hexdigest()
for row in json.loads((p/'packet-manifest.json').read_text()):
 b=(p/row['path']).read_bytes();assert len(b)==row['bytes']and h(b)==row['sha256'],row['path']
v=json.loads((p/'verification.json').read_text())
for row in v['externalInputs']:assert h((root/row['path']).read_bytes())==row['sha256'],row['path']
d=Path(sys.argv[1]);assert not d.exists(),'Target must not exist';d.mkdir(parents=True)
for f in (p/'scripts').iterdir():shutil.copy2(f,d/f.name)
sources=json.loads(gzip.decompress((root/'docs/pinball-experiments/save-vertical-fork-study/payload/sources.json.gz').read_bytes()));sources['scripts/pinball-playability-audit.mjs']=(p/'payload/audit-source.mjs').read_text();(d/'sources.json').write_text(json.dumps(sources,separators=(',',':')));assert h((d/'sources.json').read_bytes())==v['sourceMapSHA256']
(d/'earning-observations.json').write_bytes(gzip.decompress((p/'evidence/earning-observations.json.gz').read_bytes()));assert h((d/'earning-observations.json').read_bytes())==v['observationSHA256'];shutil.copy2(p/'evidence/natural-comparison.json',d/'natural-comparison.json');print('Verified packet and external inputs; restored exact source map and recorded observations:',d)
