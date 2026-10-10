/* Source-constrained, interpretive landforms. Units are metres at 1:1 scale.
         Polygons identify plateau crests, NOT measured ancient cadastral boundaries. */
      export const RomaTerrain = (() => {
        const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
        const smooth = (a, b, v) => { const t = clamp((v-a)/(b-a), 0, 1); return t*t*(3-2*t); };
        function segmentDistance(x, z, a, b) {
          const dx=b.x-a.x, dz=b.y-a.y;
          const t=clamp(((x-a.x)*dx+(z-a.y)*dz)/(dx*dx+dz*dz || 1),0,1);
          return Math.hypot(x-a.x-t*dx, z-a.y-t*dz);
        }
        function polygonDistance(x,z,poly) {
          let inside=false, distance=Infinity;
          for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
            const a=poly[i],b=poly[j];
            if ((a.y>z)!==(b.y>z) && x<(b.x-a.x)*(z-a.y)/(b.y-a.y)+a.x) inside=!inside;
            distance=Math.min(distance,segmentDistance(x,z,a,b));
          }
          return inside ? -distance : distance;
        }
        function create(geo, project) {
          const cfg=geo.terrainModel;
          if (!cfg || cfg.verticalScale !== 1) throw new Error("地形の縮尺設定が不正です");
          const all=[...geo.hills,...cfg.additionalRidges].map(h => ({
            ...h, p:project(h.lat,h.lon),
            polygon:h.plateauRingLonLat?.map(p=>project(p[1],p[0]))
          }));
          const valleys=cfg.valleys.map(v=>({...v,points:v.points.map(p=>project(p[1],p[0]))}));
          const base=cfg.valleyBaseM;
          function hillWeight(h,x,z) {
            if(h.polygon) return 1-smooth(0,h.slopeWidthM,polygonDistance(x,z,h.polygon));
            const dx=(x-h.p.x)/h.radiusEastM, dz=(z-h.p.y)/h.radiusNorthM;
            return 1-smooth(h.plateauRatio || .45,1,Math.hypot(dx,dz));
          }
          function landHeight(x,z) {
            let height=base+0.65*Math.sin(x*.0012)*Math.cos(z*.0011);
            for(const h of all) height=Math.max(height,base+(h.heightM-base)*hillWeight(h,x,z));
            // The saddle stays lower than both Capitoline summits.
            const cp=all.find(h=>h.id==='capitoline');
            if(cp) {
              const d=((x-cp.p.x-2)/47)**2+((z-cp.p.y+45)/45)**2;
              if(d<4) height-=7*Math.exp(-d*1.4)*hillWeight(cp,x,z);
            }
            for(const v of valleys) {
              let distance=Infinity;
              for(let i=1;i<v.points.length;i++) distance=Math.min(distance,segmentDistance(x,z,v.points[i-1],v.points[i]));
              const weight=1-smooth(v.halfWidthM,v.halfWidthM+v.featherM,distance);
              if(weight>0) height+=(Math.min(height,v.heightM)-height)*weight;
            }
            return height;
          }
          return Object.freeze({ landHeight, hillWeight, hills:all, polygonDistance });
        }
        return Object.freeze({ create });
      })();
