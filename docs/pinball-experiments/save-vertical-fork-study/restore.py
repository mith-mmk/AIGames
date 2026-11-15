from pathlib import Path
import json,gzip,hashlib,shutil,sys
p=Path(__file__).resolve().parent;h=lambda b:hashlib.sha256(b).hexdigest()
for row in json.loads((p/'packet-manifest.json').read_text()):
 b=(p/row['path']).read_bytes();assert len(b)==row['bytes']and h(b)==row['sha256'],row['path']
d=Path(sys.argv[1]);assert not d.exists(),'Target must not exist';d.mkdir(parents=True)
for f in (p/'scripts').iterdir():shutil.copy2(f,d/f.name)
for f in (p/'payload').iterdir():
 if f.name=='sources.json.gz':(d/'sources.json').write_bytes(gzip.decompress(f.read_bytes()))
 else:shutil.copy2(f,d/f.name)
print('Verified packet; restored exact runtime and geometry with archived input routing:',d)
