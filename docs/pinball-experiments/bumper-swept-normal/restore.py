import pathlib,json,hashlib,sys
here=pathlib.Path(__file__).resolve().parent;root=here.parents[2]
for name,expected in json.loads((here/'source-hashes.json').read_text()).items():
 if name.startswith('web/'):
  assert hashlib.sha256((root/name).read_bytes()).hexdigest()==expected,name
name=sys.argv[1] if len(sys.argv)>1 else 'bumper-swept-normal-replay-final'
if not name or '/' in name or name in ['.','..']:raise ValueError('Specify one artifact directory name')
out=root/'artifacts/pinball'/name
files=['diagnostic.mjs','loader.mjs','swept-loader.mjs','order-loader.mjs','fixture-probe.mjs']
def restore(pairs):
 prepared=[(dst,src.read_bytes()) for src,dst in pairs]
 for dst,data in prepared:
  if dst.exists() and dst.read_bytes()!=data:raise RuntimeError(f'Refusing conflicting file {dst}')
 for dst,data in prepared:
  if dst.exists():continue
  dst.parent.mkdir(parents=True,exist_ok=True)
  with dst.open('xb') as stream:stream.write(data)
restore([(here/f,out/f) for f in files])
print(out)
