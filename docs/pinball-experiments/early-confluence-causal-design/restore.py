from pathlib import Path
import json,gzip,hashlib,shutil,sys
p=Path(__file__).resolve().parent
h=lambda b:hashlib.sha256(b).hexdigest()
for row in json.loads((p/'packet-manifest.json').read_text()):
 b=(p/row['path']).read_bytes();assert h(b)==row['sha256'] and len(b)==row['bytes'],row['path']
d=Path(sys.argv[1]);variant=sys.argv[2];assert variant in ['ordered','original'];assert not d.exists(),'Target must not exist';d.mkdir(parents=True)
for f in (p/'scripts').iterdir():shutil.copy2(f,d/f.name)
checks={}
for n,out in [(variant+'-sources.json','sources.json'),('baseline-sources.json','baseline-sources.json'),('test-sources.json','test-sources.json')]:
 b=gzip.decompress((p/'payload'/(n+'.gz')).read_bytes());(d/out).write_bytes(b);checks[out]=h(b)
(d/'restored-variant.json').write_text(json.dumps({'variant':variant,'hashes':checks},indent=2))
print('Verified manifest; restored exact',variant,'map and archived tests',checks)
