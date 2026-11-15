from pathlib import Path
import tarfile,hashlib,json
archive=Path(__file__).resolve().parent
root=archive.parents[2]
out=root/'artifacts/pinball/plunger-fit-v2-replay'
if out.exists():
    raise SystemExit('Refusing to overwrite existing replay directory: '+str(out))
manifest=json.loads((archive/'manifest.json').read_text())
payload=archive/'replay-payload.tar.gz'
assert hashlib.sha256(payload.read_bytes()).hexdigest()==manifest['files']['replay-payload.tar.gz']['sha256']
out.mkdir(parents=True,exist_ok=False)
with tarfile.open(payload) as bundle:
    bundle.extractall(out,filter='data')
assert hashlib.sha256((out/'runtime-source-map.json').read_bytes()).hexdigest()==manifest['runtimeSourceMapSha256']
print('Restored exact isolated payload to',out)
