import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim();
const manifest=JSON.parse(fs.readFileSync(path.join(here,'manifest.json')));
if(path.basename(root)!=='AIGames')throw Error('Preserved loader resolves /AIGames/ paths. Use a checkout named AIGames; do not silently rewrite the frozen source.');
execFileSync('git',['cat-file','-e',manifest.accepted_runtime_commit+'^{commit}'],{cwd:root});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const e of manifest.bundled_evidence||[]){if(sha(fs.readFileSync(path.join(here,e.file)))!==e.sha256)throw Error('Evidence snapshot hash mismatch: '+e.file);}
const jobs=manifest.files.map(f=>{const body=fs.readFileSync(path.join(here,f.file)),target=path.resolve(root,f.restore_to);if(!target.startsWith(path.join(root,'artifacts')+path.sep))throw Error('Unsafe restore target');if(sha(body)!==f.sha256)throw Error('Payload hash mismatch: '+f.file);if(fs.existsSync(target)&&sha(fs.readFileSync(target))!==f.sha256)throw Error('Refusing to overwrite different artifact: '+f.restore_to);return{target,body,name:f.restore_to};});
for(const j of jobs){fs.mkdirSync(path.dirname(j.target),{recursive:true});if(!fs.existsSync(j.target))fs.writeFileSync(j.target,j.body,{flag:'wx'});console.log('Verified/restored '+j.name);}
