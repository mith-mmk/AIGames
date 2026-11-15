import pathlib,json,hashlib
here=pathlib.Path(__file__).resolve().parent;root=here.parents[2]
for name,expected in json.loads((here/'baseline-inputs.json').read_text()).items():
 assert hashlib.sha256((root/name).read_bytes()).hexdigest()==expected,name
out=root/'artifacts/pinball/plunger-order-isolation'
files=['loader.mjs','observe.mjs','analyze.py']+[p.name for p in here.glob('*-sources.json')]
def restore_files(pairs):
 prepared=[(destination,source.read_bytes()) for source,destination in pairs]
 for destination,data in prepared:
  if destination.exists() and destination.read_bytes()!=data:raise RuntimeError(f'Refusing conflicting file: {destination}')
 for destination,data in prepared:
  if destination.exists():continue
  destination.parent.mkdir(parents=True,exist_ok=True)
  with destination.open('xb') as stream:stream.write(data)
# Optional fresh destination remains under artifacts and must have identical depth for relative imports.
import sys
if len(sys.argv)>1:
 name=sys.argv[1]
 if not name or '/' in name or name in ['.','..']:raise ValueError('Use one fresh artifact directory name')
 out=root/'artifacts/pinball'/name
restore_files([(here/name,out/name) for name in files])
print(out)
