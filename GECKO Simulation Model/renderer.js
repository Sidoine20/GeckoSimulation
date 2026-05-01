/* GECKO RENDERER — Drawing classes */

class Renderer {
    constructor(canvas,room,gecko,dw,dh){
        this.canvas=canvas;this.ctx=canvas.getContext('2d');
        this.room=room;this.gecko=gecko;this.displayW=dw;this.displayH=dh;
        this.showForces=true;this.showSetae=false;this.showGrid=false;this.showTrail=false;
    }
    clear(){
        const ctx=this.ctx,w=this.displayW,h=this.displayH;
        const bg=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w*0.7);
        bg.addColorStop(0,'#141824');bg.addColorStop(1,'#0b0e14');
        ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    }
    drawRoom(){
        const ctx=this.ctx,r=this.room,mat=r.getMaterial();
        ctx.fillStyle='#0f1218';ctx.fillRect(r.left,r.top,r.w,r.h);
        if(this.showGrid){
            ctx.strokeStyle='rgba(255,255,255,0.03)';ctx.lineWidth=1;
            for(let x=r.left;x<=r.right;x+=30){ctx.beginPath();ctx.moveTo(x,r.top);ctx.lineTo(x,r.bottom);ctx.stroke();}
            for(let y=r.top;y<=r.bottom;y+=30){ctx.beginPath();ctx.moveTo(r.left,y);ctx.lineTo(r.right,y);ctx.stroke();}
        }
        this.drawSeg(r.left,r.bottom,r.right,r.bottom,mat);
        this.drawSeg(r.right,r.bottom,r.right,r.top,mat);
        this.drawSeg(r.right,r.top,r.left,r.top,mat);
        this.drawSeg(r.left,r.top,r.left,r.bottom,mat);
        ctx.fillStyle=mat.accent;
        [[r.left,r.top],[r.right,r.top],[r.right,r.bottom],[r.left,r.bottom]].forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill()});
        ctx.font='10px Inter';ctx.fillStyle='rgba(255,255,255,0.15)';ctx.textAlign='center';
        ctx.fillText('FLOOR',(r.left+r.right)/2,r.bottom+22);
        ctx.fillText('CEILING',(r.left+r.right)/2,r.top-12);
        ctx.save();ctx.translate(r.right+22,(r.top+r.bottom)/2);ctx.rotate(Math.PI/2);ctx.fillText('WALL',0,0);ctx.restore();
        ctx.save();ctx.translate(r.left-22,(r.top+r.bottom)/2);ctx.rotate(-Math.PI/2);ctx.fillText('WALL',0,0);ctx.restore();
        // Gravity indicator
        const cx=(r.left+r.right)/2,cy=(r.top+r.bottom)/2;
        ctx.save();ctx.globalAlpha=0.12;ctx.strokeStyle='#ff5c6a';ctx.lineWidth=2;ctx.setLineDash([4,4]);
        ctx.beginPath();ctx.moveTo(cx,cy-20);ctx.lineTo(cx,cy+20);ctx.stroke();
        ctx.beginPath();ctx.moveTo(cx-5,cy+14);ctx.lineTo(cx,cy+22);ctx.lineTo(cx+5,cy+14);ctx.stroke();
        ctx.setLineDash([]);ctx.font='9px Inter';ctx.fillStyle='#ff5c6a';ctx.textAlign='center';ctx.fillText('g',cx+12,cy+5);ctx.restore();
    }
    drawSeg(x1,y1,x2,y2,mat){
        const ctx=this.ctx;
        ctx.strokeStyle=mat.color;ctx.lineWidth=6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
        ctx.strokeStyle=mat.accent+'40';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
        const dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy),steps=Math.floor(len/20);
        ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=1;
        for(let i=1;i<steps;i++){const t=i/steps,px=x1+dx*t,py=y1+dy*t,nx=-dy/len*3,ny=dx/len*3;ctx.beginPath();ctx.moveTo(px-nx,py-ny);ctx.lineTo(px+nx,py+ny);ctx.stroke();}
    }
    drawTrail(){
        if(!this.showTrail||this.gecko.trail.length<2)return;
        const ctx=this.ctx,tr=this.gecko.trail;
        ctx.beginPath();ctx.moveTo(tr[0].x,tr[0].y);
        for(let i=1;i<tr.length;i++)ctx.lineTo(tr[i].x,tr[i].y);
        ctx.strokeStyle='rgba(0,229,160,0.08)';ctx.lineWidth=2;ctx.stroke();
        for(let i=0;i<tr.length;i+=10){ctx.fillStyle=`rgba(0,229,160,${0.05+(i/tr.length)*0.12})`;ctx.beginPath();ctx.arc(tr[i].x,tr[i].y,1.5,0,Math.PI*2);ctx.fill();}
    }
    drawGecko(){
        const ctx=this.ctx,g=this.gecko,sp=g.spine;if(sp.length<2)return;
        const sc=SPECIES[g.speciesKey];
        this.drawLeg(1,sc?sc.accentColor+'99':'rgba(35,90,55,0.6)',2.5);
        this.drawLeg(3,sc?sc.accentColor+'99':'rgba(35,90,55,0.6)',2.5);
        const dP=[],vP=[];
        for(let i=0;i<sp.length;i++){const s=sp[i],w=g.bodyWidths[i];dP.push(s.pos.add(s.normal.scale(w*0.55)));vP.push(s.pos.add(s.normal.scale(-w*0.35)));}
        ctx.beginPath();ctx.moveTo(dP[0].x,dP[0].y);
        for(let i=1;i<dP.length;i++){const p=dP[i-1],c=dP[i];ctx.quadraticCurveTo(p.x,p.y,(p.x+c.x)/2,(p.y+c.y)/2);}
        ctx.lineTo(dP[dP.length-1].x,dP[dP.length-1].y);ctx.lineTo(sp[sp.length-1].pos.x,sp[sp.length-1].pos.y);
        ctx.lineTo(vP[vP.length-1].x,vP[vP.length-1].y);
        for(let i=vP.length-2;i>=0;i--){const p=vP[i+1],c=vP[i];ctx.quadraticCurveTo(p.x,p.y,(p.x+c.x)/2,(p.y+c.y)/2);}
        ctx.closePath();
        const bc1=sc?sc.bodyColor:'#3d8a55',bc2=sc?sc.accentColor:'#2d7245';
        const bg=ctx.createLinearGradient(sp[0].pos.x,sp[0].pos.y,sp[Math.floor(sp.length/2)].pos.x,sp[Math.floor(sp.length/2)].pos.y);
        bg.addColorStop(0,bc1);bg.addColorStop(0.5,bc2);bg.addColorStop(1,bc1);
        ctx.fillStyle=bg;ctx.fill();ctx.strokeStyle='rgba(20,50,30,0.5)';ctx.lineWidth=1;ctx.stroke();
        for(let i=3;i<sp.length-4;i+=2){const s=sp[i],w=g.bodyWidths[i]*0.3,center=s.pos.add(s.normal.scale(w*0.3));
            ctx.fillStyle='rgba(25,65,38,0.5)';ctx.beginPath();const t=s.tangent.scale(2.5),n=s.normal.scale(2);
            ctx.moveTo(center.x+t.x,center.y+t.y);ctx.lineTo(center.x+n.x,center.y+n.y);ctx.lineTo(center.x-t.x,center.y-t.y);ctx.lineTo(center.x-n.x,center.y-n.y);ctx.closePath();ctx.fill();}
        this.drawLeg(0,bc1,3);this.drawLeg(2,bc1,3);this.drawHead();
    }
    drawHead(){
        const ctx=this.ctx,g=this.gecko,s0=g.spine[0],s1=g.spine[1];
        const fw=s0.pos.sub(s1.pos).normalize(),up=s0.normal;
        const ep=s0.pos.add(fw.scale(2)).add(up.scale(g.bodyWidths[0]*0.3));
        ctx.fillStyle='#e8c430';ctx.beginPath();ctx.arc(ep.x,ep.y,3.5,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#1a1a1a';ctx.beginPath();ctx.ellipse(ep.x,ep.y,1.2,2.8,up.angle(),0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(255,255,255,0.7)';ctx.beginPath();ctx.arc(ep.x+1,ep.y-1.2,0.9,0,Math.PI*2);ctx.fill();
        const np=s0.pos.add(fw.scale(5)).add(up.scale(g.bodyWidths[0]*0.1));
        ctx.fillStyle='rgba(15,40,20,0.6)';ctx.beginPath();ctx.arc(np.x,np.y,0.8,0,Math.PI*2);ctx.fill();
    }
    drawLeg(li,color,lw){
        const ctx=this.ctx,g=this.gecko,foot=g.feet[li],ai=g.limbAttach[li],sp=g.spine[ai];
        const shoulder=sp.pos.add(sp.normal.scale(-g.bodyWidths[ai]*0.2));
        const knee=g.solveIK(shoulder,foot.pos,g.limbSide[li]);
        ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.lineCap='round';ctx.lineJoin='round';
        ctx.beginPath();ctx.moveTo(shoulder.x,shoulder.y);ctx.lineTo(knee.x,knee.y);ctx.lineTo(foot.pos.x,foot.pos.y);ctx.stroke();
        ctx.fillStyle=color;ctx.beginPath();ctx.arc(knee.x,knee.y,2,0,Math.PI*2);ctx.fill();
        this.drawFoot(foot,sp,li);
    }
    drawFoot(foot,sp,li){
        const ctx=this.ctx;
        if(foot.attached){
            for(let t=0;t<5;t++){const a=-Math.PI*0.25+(Math.PI*0.5/4)*t;
                const te=foot.pos.add(Vec2.fromAngle(sp.tangent.angle()+a,5));
                ctx.strokeStyle='#5aa06a';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(foot.pos.x,foot.pos.y);ctx.lineTo(te.x,te.y);ctx.stroke();
                ctx.fillStyle='#7ac08a';ctx.beginPath();ctx.arc(te.x,te.y,1.5,0,Math.PI*2);ctx.fill();}
            if(this.showSetae){const n=sp.normal.negate();ctx.strokeStyle='rgba(100,200,140,0.25)';ctx.lineWidth=0.5;
                for(let i=0;i<12;i++){const o=(i-6)*1.2,b=foot.pos.add(sp.tangent.scale(o)),tip=b.add(n.scale(4));
                    ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(tip.x,tip.y);ctx.stroke();
                    ctx.fillStyle='rgba(100,200,140,0.15)';ctx.beginPath();ctx.arc(tip.x,tip.y,0.6,0,Math.PI*2);ctx.fill();}}
            ctx.fillStyle='rgba(0,229,160,0.15)';ctx.beginPath();ctx.arc(foot.pos.x,foot.pos.y,6,0,Math.PI*2);ctx.fill();
        }else{ctx.fillStyle='#4a9a5a';ctx.beginPath();ctx.arc(foot.pos.x,foot.pos.y,2.5,0,Math.PI*2);ctx.fill();}
    }
    drawForces(){
        if(!this.showForces)return;const ctx=this.ctx,g=this.gecko,ms=g.spine[Math.floor(g.segCount/2)];
        const gv=g.forces.gravity.scale(25);this.drawArrow(ms.pos,ms.pos.add(gv),'#ff5c6a',2,'Fg');
        for(let i=0;i<4;i++){if(g.feet[i].attached){const f=g.forces.adhesionPerFoot[i].scale(12);this.drawArrow(g.feet[i].pos,g.feet[i].pos.add(f),'#00e5a0',1.5);}}
        const nv=g.forces.net.scale(15);if(nv.length()>2)this.drawArrow(ms.pos,ms.pos.add(nv),'#ffdd44',2,'Fnet');
        // Legend
        const x=this.room.left+10,y=this.room.bottom+40;ctx.font='10px Inter';
        [['#ff5c6a','Gravity (Fg)'],['#00e5a0','Adhesion'],['#ffdd44','Net Force']].forEach(([c,l],i)=>{
            const ix=x+i*110;ctx.fillStyle=c;ctx.beginPath();ctx.arc(ix,y,3.5,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='rgba(255,255,255,0.35)';ctx.textAlign='left';ctx.fillText(l,ix+8,y+3.5);});
    }
    drawArrow(from,to,color,w,label){
        const ctx=this.ctx,dir=to.sub(from),len=dir.length();if(len<1)return;
        const n=dir.normalize(),hl=Math.min(8,len*0.3),hw=hl*0.5;
        ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.lineTo(to.x-n.x*hl*0.5,to.y-n.y*hl*0.5);ctx.stroke();
        const p=n.perpCW();ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(to.x,to.y);
        ctx.lineTo(to.x-n.x*hl+p.x*hw,to.y-n.y*hl+p.y*hw);ctx.lineTo(to.x-n.x*hl-p.x*hw,to.y-n.y*hl-p.y*hw);ctx.closePath();ctx.fill();
        if(label){ctx.font='9px JetBrains Mono,monospace';ctx.fillStyle=color;ctx.textAlign='left';const lp=to.add(n.perpCW().scale(10));ctx.fillText(label,lp.x,lp.y);}
    }
    render(){this.clear();this.drawRoom();this.drawTrail();this.drawGecko();this.drawForces();}
}
