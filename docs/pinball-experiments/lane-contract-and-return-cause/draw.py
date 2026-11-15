from pathlib import Path
import json,html
p=Path(__file__).parent
S=[json.loads((p/(n+'.json')).read_text()) for n in ['stable','v2']]
def esc(s):return html.escape(str(s))
svg=['<svg xmlns="http://www.w3.org/2000/svg" width="1380" height="1060" viewBox="0 0 1380 1060"><rect width="1380" height="1060" fill="#f5f7fb"/><style>text{font-family:Arial,\'Hiragino Sans\',sans-serif;fill:#183147} .small{font-size:16px} .body{font-size:19px} .head{font-size:24px;font-weight:bold}</style><defs><clipPath id="plot"><rect x="0" y="0" width="500" height="710"/></clipPath></defs>']
svg+=['<text x="30" y="38" class="head">左 IN / OUT・ランプ帰還の契約図（実ソースから抽出）</text><text x="30" y="66" class="small">上から見た X-Z 投影。単位は盤面座標。高さの違う部品も重なるため、この図だけでは接触・通過を保証しません。</text>']
for k,d in enumerate(S):
 ox=40+k*690;oy=130;scale=150
 def P(x,z):return ((x+2.95)*scale,(z-.6)*scale)
 def pts(a):return ' '.join(f'{P(q[0],q[2])[0]:.3f},{P(q[0],q[2])[1]:.3f}' for q in a)
 svg+=[f'<text x="{ox}" y="108" class="head">'+('安定版：採用中' if k==0 else 'V2：不採用・本番未統合')+'</text>',f'<g transform="translate({ox},{oy})">','<rect width="500" height="710" fill="white" stroke="#c4ced8"/>']
 for z in [1,2,3,4,5]:
  y=P(0,z)[1];svg +=[f'<path d="M0 {y} H500" stroke="#e4eaf0"/><text x="4" y="{y-5}" class="small">Z {z}</text>']
 svg+=['<g clip-path="url(#plot)">']
 # Actual inner cabinet face, not a playfield extension.
 x=P(-2.73,0)[0];svg+=[f'<path d="M{x} 0 V710" stroke="#697888" stroke-width="8"/>']
 poly=' '.join(f'{P(x,z)[0]},{P(x,z)[1]}' for x,z in d['sling']);svg+=[f'<polygon points="{poly}" fill="#ffe5a1" stroke="#bc8b17" stroke-width="2"/>']
 for i,path in enumerate(d['paths']):svg+=[f'<polyline points="{pts(path)}" fill="none" stroke="{["#147d94","#147d94","#264c80"][i]}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>']
 svg+=[f'<polyline points="{pts(d["wire"])}" fill="none" stroke="#9992b6" stroke-width="10" stroke-opacity=".60"/>']
 for m in d['supports']:
  xx,yy=P(m['x'],m['z']); moved=k==1 and m['i'] in [192,240]
  if moved:
   xx=P(-2.73,m['z'])[0];end=P(-2.4 if m['i']==192 else -1.72,m['z'])[0];svg+=[f'<path d="M{xx-27} {yy} H{end}" stroke="#5f5377" stroke-width="7"/><rect x="{xx-31}" y="{yy-9}" width="12" height="18" fill="#5f5377"/>']
  else:svg+=[f'<circle cx="{xx}" cy="{yy}" r="{.085*scale}" fill="#b6a7cb" stroke="#5f5377"/>']
  svg+=[f'<text x="{xx+13}" y="{yy-12}" class="small">支点 {m["i"]}</text>']
 c=d['sensor']['center'];x,y=P(c[0]-.125,c[2]-.04)
 svg+=[f'<rect x="{x-.135*scale}" y="{y-.135*scale}" width="{.52*scale}" height="{.35*scale}" rx="{.135*scale}" fill="#ffd5db" fill-opacity=".65" stroke="#c22e4d" stroke-dasharray="4 4"/>',f'<rect x="{x}" y="{y}" width="{.25*scale}" height="{.08*scale}" fill="#c22e4d"/>']
 # Existing old tail is highlighted as the actual preserved reference contract.
 tail=S[0]['paths'][0][21:];svg+=[f'<polyline points="{pts(tail)}" fill="none" stroke="#7e3ca6" stroke-width="2"/>']
 t=d['save']['trigger'];x,y=P(t['x'][0],t['z'][0]);svg+=[f'<rect x="{x}" y="{y}" width="{(t["x"][1]-t["x"][0])*scale}" height="{(t["z"][1]-t["z"][0])*scale}" fill="#7fcda4" fill-opacity=".45" stroke="#087744"/>']
 tr=json.loads((p/'diagram-trajectories.json').read_text())[k]['positions'];route=' '.join(f'{P(q["x"],q["z"])[0]:.2f},{P(q["x"],q["z"])[1]:.2f}' for q in tr);svg+=[f'<polyline points="{route}" fill="none" stroke="#ef7b20" stroke-width="2.5" stroke-dasharray="5 4"/>']
 x,y=P(d['pivot'][0],d['pivot'][2]);svg+=[f'<circle cx="{x}" cy="{y}" r="10" fill="white" stroke="#183147" stroke-width="3"/><text x="{x+17}" y="{y+6}" class="small">固定した軸</text>'];y=P(0,d['drainZ'])[1];svg+=[f'<path d="M0 {y} H500" stroke="#b43c36" stroke-dasharray="8 4"/>','</g>']
 # Labels outside the plotting region.
 for j,text in enumerate(['太線：実レールの平面投影','紫：高所ワイヤー／支持（床ではない）','赤：旧 IN 検出器。薄赤は床球中心の接触範囲','緑：save 作動領域（接触機構ではない）','橙：速度 2 の球軌跡、捕捉まで']):svg+=[f'<text x="5" y="{745+j*25}" class="small">{esc(text)}</text>']
 if k==1:
  xx,yy=P(-1.7410209957,3.778770246)
  svg+=[f'<circle cx="{xx}" cy="{yy}" r="6" fill="#f24b36" stroke="#8d2012" stroke-width="2"/>',f'<path d="M{xx-7} {yy-38} L{xx} {yy} L{xx+22} {yy+25}" fill="none" stroke="#d33a23" stroke-width="3"/>',f'<text x="{xx+25}" y="{yy+8}" class="small">新 socket 接触</text>']
 svg+=['</g>']
 # Clear numeric contract notes alongside plot, inside panel width.
 notes=['IN sensor','X = −1.70','Z = 3.05','Y = 0.00–0.40','基礎100点 ×倍率', '', '球径 .270'] if k==0 else ['旧 sensor 固定','新 IN は検出漏れ','4速度中 4件', '', 'save 移設','X = −2.515','Z = 2.42..2.69']
 for j,t in enumerate(notes):svg+=[f'<text x="{ox+510}" y="{310+j*25}" class="small">{esc(t)}</text>']
svg+=['<text x="30" y="1015" class="body">契約の区別：物理的に通れる ≠ IN が得点する ≠ 捕捉できる ≠ ランプ後に同じ球で反復できる。</text><text x="30" y="1043" class="small">V2 の OUT 改善だけでは採用不可：同球再捕捉の回帰 2件、自然54ゲームのランプ通過 61→15。新形状追加なし。</text></svg>']
(p/'contract-diagram.svg').write_text('\n'.join(svg))
