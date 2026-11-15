import pathlib,json,hashlib,gzip,sys,shutil
p=pathlib.Path(__file__).resolve().parent
h=lambda b:hashlib.sha256(b).hexdigest()
for row in json.loads((p/'packet-manifest.json').read_text()):
 b=(p/row['path']).read_bytes();assert len(b)==row['bytes'] and h(b)==row['sha256'],row['path']
d=pathlib.Path(sys.argv[1]);assert not d.exists(),'Destination must not exist';d.mkdir(parents=True)
for f in (p/'scripts').iterdir():shutil.copy2(f,d/f.name)
refs={pathlib.Path(x['path']).name:x['sha256'] for x in json.loads((p/'evidence-references.json').read_text()) if '/preview/' not in x['path']}
for f in (p/'payload').glob('*.gz'):
 b=gzip.decompress(f.read_bytes());n=f.name[:-3];assert h(b)==refs[n];(d/n).write_bytes(b)
print('Verified packet manifest; restored exact payload maps, original tests, state and scripts:',d)
