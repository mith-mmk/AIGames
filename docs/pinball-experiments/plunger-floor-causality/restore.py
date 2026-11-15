import pathlib,hashlib,json
root=pathlib.Path(__file__).resolve().parents[3];here=pathlib.Path(__file__).parent
for name,expected in json.loads((here/'inputs.json').read_text()).items():
 if name.startswith('artifacts/'):continue
 assert hashlib.sha256((root/name).read_bytes()).hexdigest()==expected,name
out=root/'artifacts/pinball/plunger-floor-causality'
v2=root/'artifacts/pinball/plunger-fit-v2-71245b2'
source=here.parent/'plunger-fit-v2/runtime-source-map.json'
assert hashlib.sha256(source.read_bytes()).hexdigest()=='022605fdccd86d5514c6d34820e3edda1d3d1980c577ae0f05eccff85cb92690'
def restore_files(pairs):
 # Preflight every destination before creating directories or writing any file.
 prepared=[(destination,source.read_bytes()) for source,destination in pairs]
 for destination,data in prepared:
  if destination.exists() and destination.read_bytes()!=data:
   raise RuntimeError(f'Refusing to overwrite conflicting file: {destination}')
 for destination,data in prepared:
  if destination.exists():continue
  destination.parent.mkdir(parents=True,exist_ok=True)
  # Exclusive creation also refuses a concurrent new destination.
  with destination.open('xb') as stream:stream.write(data)
restore_files([(here/name,out/name) for name in ['loader.mjs','observe.mjs']]+[(source,v2/'runtime-source-map.json')])
print(out)
