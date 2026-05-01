/* GECKO ENGINE — Core simulation classes */

class Vec2 {
    constructor(x=0,y=0){this.x=x;this.y=y}
    add(v){return new Vec2(this.x+v.x,this.y+v.y)}
    sub(v){return new Vec2(this.x-v.x,this.y-v.y)}
    scale(s){return new Vec2(this.x*s,this.y*s)}
    length(){return Math.sqrt(this.x*this.x+this.y*this.y)}
    lengthSq(){return this.x*this.x+this.y*this.y}
    normalize(){const l=this.length();return l>0.0001?this.scale(1/l):new Vec2()}
    dot(v){return this.x*v.x+this.y*v.y}
    cross(v){return this.x*v.y-this.y*v.x}
    rotate(a){const c=Math.cos(a),s=Math.sin(a);return new Vec2(this.x*c-this.y*s,this.x*s+this.y*c)}
    perpCW(){return new Vec2(this.y,-this.x)}
    perpCCW(){return new Vec2(-this.y,this.x)}
    lerp(v,t){return new Vec2(this.x+(v.x-this.x)*t,this.y+(v.y-this.y)*t)}
    clone(){return new Vec2(this.x,this.y)}
    distTo(v){return this.sub(v).length()}
    angle(){return Math.atan2(this.y,this.x)}
    negate(){return new Vec2(-this.x,-this.y)}
    static fromAngle(a,len=1){return new Vec2(Math.cos(a)*len,Math.sin(a)*len)}
}

class Room {
    constructor(w,h){
        this.padding=90;this.left=this.padding;this.top=this.padding;
        this.right=w-this.padding;this.bottom=h-this.padding;
        this.w=this.right-this.left;this.h=this.bottom-this.top;
        this.perimeter=2*(this.w+this.h);
        this.surfaceMaterial='stone';
        this.materialProps={
            stone:{roughness:0.85,adhesionMult:1.0,color:'#6b6560',accent:'#7d7872'},
            glass:{roughness:0.15,adhesionMult:0.92,color:'#5a7a8a',accent:'#6a8a9a'},
            wood:{roughness:0.70,adhesionMult:0.88,color:'#7a6248',accent:'#8a7258'},
            metal:{roughness:0.25,adhesionMult:0.78,color:'#707580',accent:'#808590'},
        };
    }
    getMaterial(){return this.materialProps[this.surfaceMaterial]||this.materialProps.stone}
    getPathPoint(d){
        d=((d%this.perimeter)+this.perimeter)%this.perimeter;
        let pos,normal,tangent;
        if(d<=this.w){pos=new Vec2(this.left+d,this.bottom);normal=new Vec2(0,-1);tangent=new Vec2(1,0)}
        else if(d<=this.w+this.h){const l=d-this.w;pos=new Vec2(this.right,this.bottom-l);normal=new Vec2(-1,0);tangent=new Vec2(0,-1)}
        else if(d<=2*this.w+this.h){const l=d-this.w-this.h;pos=new Vec2(this.right-l,this.top);normal=new Vec2(0,1);tangent=new Vec2(-1,0)}
        else{const l=d-2*this.w-this.h;pos=new Vec2(this.left,this.top+l);normal=new Vec2(1,0);tangent=new Vec2(0,1)}
        return{pos,normal,tangent,d};
    }
    getSurfaceName(d){
        d=((d%this.perimeter)+this.perimeter)%this.perimeter;
        if(d<=this.w)return'Floor';if(d<=this.w+this.h)return'Right Wall';
        if(d<=2*this.w+this.h)return'Ceiling';return'Left Wall';
    }
    getGravityChallenge(d){
        d=((d%this.perimeter)+this.perimeter)%this.perimeter;
        if(d<=this.w)return 0;if(d<=this.w+this.h)return 0.5;
        if(d<=2*this.w+this.h)return 1.0;return 0.5;
    }
}

const SPECIES = {
    tokay:{name:'Tokay Gecko',sci:'Gekko gecko',length:'25–30 cm',mass:'150–300 g',maxSpeed:'1.5 m/s',gaitName:'Diagonal Trot',adhesionLabel:'Very Strong',habitat:'Arboreal',toePads:'Yes',dutyFactor:0.65,speed:80,gaitSpeed:2.5,strideLength:32,segCount:22,segSpacing:6,bodyOffset:14,bodyColor:'#3d8a55',accentColor:'#2d7245',upperLen:20,lowerLen:18,limbAttach:[5,5,13,13],phaseOffsets:[0,0.5,0.5,0],mass_kg:0.06},
    crested:{name:'Crested Gecko',sci:'Correlophus ciliatus',length:'15–20 cm',mass:'35–55 g',maxSpeed:'0.8 m/s',gaitName:'Lateral Sequence',adhesionLabel:'Moderate',habitat:'Arboreal',toePads:'Yes',dutyFactor:0.72,speed:50,gaitSpeed:2.0,strideLength:22,segCount:18,segSpacing:5,bodyOffset:12,bodyColor:'#8a6a45',accentColor:'#6b5535',upperLen:16,lowerLen:14,limbAttach:[4,4,11,11],phaseOffsets:[0,0.25,0.5,0.75],mass_kg:0.045},
    leopard:{name:'Leopard Gecko',sci:'Eublepharis macularius',length:'20–25 cm',mass:'45–80 g',maxSpeed:'1.0 m/s',gaitName:'Diagonal Trot',adhesionLabel:'Weak (no pads)',habitat:'Terrestrial',toePads:'No',dutyFactor:0.60,speed:65,gaitSpeed:2.2,strideLength:28,segCount:20,segSpacing:5.5,bodyOffset:13,bodyColor:'#c4a84d',accentColor:'#9a8438',upperLen:18,lowerLen:16,limbAttach:[5,5,12,12],phaseOffsets:[0,0.5,0.5,0],mass_kg:0.055},
    daygecko:{name:'Day Gecko',sci:'Phelsuma madagascariensis',length:'10–15 cm',mass:'25–40 g',maxSpeed:'1.2 m/s',gaitName:'Diagonal Trot',adhesionLabel:'Strong',habitat:'Arboreal',toePads:'Yes',dutyFactor:0.58,speed:75,gaitSpeed:3.0,strideLength:20,segCount:16,segSpacing:4.5,bodyOffset:10,bodyColor:'#2db84a',accentColor:'#1d8a35',upperLen:14,lowerLen:12,limbAttach:[3,3,10,10],phaseOffsets:[0,0.5,0.5,0],mass_kg:0.03}
};

class Gecko {
    constructor(room, speciesKey='tokay'){
        this.room=room;this.speciesKey=speciesKey;
        const sp=SPECIES[speciesKey];
        this.headD=room.w*0.35;this.speed=sp.speed;this.speedMult=1.0;this.direction=1;this.isMoving=true;
        this.isFalling=false;this.fallVelocity=new Vec2();
        this.segCount=sp.segCount;this.segSpacing=sp.segSpacing;this.bodyOffset=sp.bodyOffset;
        this.upperLen=sp.upperLen;this.lowerLen=sp.lowerLen;
        this.limbAttach=[...sp.limbAttach];this.limbSide=[1,-1,1,-1];
        this.limbPhaseOffset=[...sp.phaseOffsets];
        this.spine=[];this.bodyWidths=[];
        for(let i=0;i<this.segCount;i++){
            const t=i/(this.segCount-1);let w;
            if(t<0.05)w=5;else if(t<0.12)w=5+(t-0.05)/0.07*6;
            else if(t<0.16)w=11;else if(t<0.22)w=11-(t-0.16)/0.06*4;
            else if(t<0.50)w=7+Math.sin((t-0.22)/0.28*Math.PI)*5;
            else if(t<0.56)w=7+Math.sin((t-0.22)/0.28*Math.PI)*4;
            else w=6*Math.pow(1-(t-0.56)/0.44,0.8);
            this.bodyWidths.push(Math.max(w,0.8));
        }
        this.feet=[];for(let i=0;i<4;i++)this.feet.push({pos:new Vec2(),surfaceD:0,attached:true,swingProgress:1,prevPos:new Vec2(),targetPos:new Vec2()});
        this.gaitPhase=0;this.gaitSpeed=sp.gaitSpeed;this.strideLength=sp.strideLength;
        this.forces={gravity:new Vec2(),adhesionPerFoot:[new Vec2(),new Vec2(),new Vec2(),new Vec2()],totalAdhesion:new Vec2(),net:new Vec2()};
        this.geckoMass=sp.mass_kg;this.trail=[];this.maxTrail=600;
        this.buildSpine();this.initFeet();
    }
    applySpecies(key){
        const sp=SPECIES[key];if(!sp)return;this.speciesKey=key;
        this.speed=sp.speed;this.segCount=sp.segCount;this.segSpacing=sp.segSpacing;this.bodyOffset=sp.bodyOffset;
        this.upperLen=sp.upperLen;this.lowerLen=sp.lowerLen;this.limbAttach=[...sp.limbAttach];
        this.limbPhaseOffset=[...sp.phaseOffsets];this.gaitSpeed=sp.gaitSpeed;this.strideLength=sp.strideLength;
        this.geckoMass=sp.mass_kg;this.bodyWidths=[];
        for(let i=0;i<this.segCount;i++){
            const t=i/(this.segCount-1);let w;
            if(t<0.05)w=5;else if(t<0.12)w=5+(t-0.05)/0.07*6;
            else if(t<0.16)w=11;else if(t<0.22)w=11-(t-0.16)/0.06*4;
            else if(t<0.50)w=7+Math.sin((t-0.22)/0.28*Math.PI)*5;
            else if(t<0.56)w=7+Math.sin((t-0.22)/0.28*Math.PI)*4;
            else w=6*Math.pow(1-(t-0.56)/0.44,0.8);
            this.bodyWidths.push(Math.max(w,0.8));
        }
        this.trail=[];this.buildSpine();this.initFeet();
    }
    buildSpine(){
        this.spine=[];const time=performance.now()*0.002;
        for(let i=0;i<this.segCount;i++){
            const d=this.headD-i*this.segSpacing*this.direction;const pt=this.room.getPathPoint(d);
            const wave=Math.sin(i*0.45+time)*1.8*(i/this.segCount);const offset=this.bodyOffset+wave*0.3;
            this.spine.push({pos:pt.pos.add(pt.normal.scale(offset)),surfacePos:pt.pos.clone(),normal:pt.normal.clone(),tangent:pt.tangent.clone(),d});
        }
    }
    initFeet(){
        for(let i=0;i<4;i++){
            const sp=this.spine[this.limbAttach[i]];
            this.feet[i].pos=sp.surfacePos.clone();this.feet[i].surfaceD=sp.d;
            this.feet[i].attached=true;this.feet[i].swingProgress=1;
            this.feet[i].prevPos=sp.surfacePos.clone();this.feet[i].targetPos=sp.surfacePos.clone();
        }
    }
    update(dt,params){
        if(this.isFalling){
            const g=params.gravity||9.8;this.fallVelocity=this.fallVelocity.add(new Vec2(0,g*50*dt));
            const fd=this.fallVelocity.scale(dt);
            for(let i=0;i<this.segCount;i++){this.spine[i].pos=this.spine[i].pos.add(fd);this.spine[i].surfacePos=this.spine[i].surfacePos.add(fd)}
            for(let i=0;i<4;i++){this.feet[i].pos=this.feet[i].pos.add(fd);this.feet[i].attached=false}
            if(this.spine[0].pos.y>this.room.bottom){
                this.isFalling=false;this.isMoving=true;
                const lx=Math.max(this.room.left+50,Math.min(this.room.right-50,this.spine[0].pos.x));
                this.headD=lx-this.room.left;this.buildSpine();this.initFeet();this.direction=1;
            }
            this.calcForces(params,true);return;
        }
        if(!this.isMoving)return;
        this.headD+=this.speed*this.speedMult*this.direction*dt;
        const time=performance.now()*0.002;
        for(let i=0;i<this.segCount;i++){
            const d=this.headD-i*this.segSpacing*this.direction;const pt=this.room.getPathPoint(d);
            const wave=Math.sin(i*0.45+time)*2.0*Math.min(i/5,1)*(i<this.segCount-2?1:0.3);
            const offset=this.bodyOffset+wave*0.25;
            this.spine[i]={pos:pt.pos.add(pt.normal.scale(offset)),surfacePos:pt.pos.clone(),normal:pt.normal.clone(),tangent:pt.tangent.clone(),d};
        }
        this.gaitPhase=(this.gaitPhase+this.gaitSpeed*dt*this.speedMult)%1;
        this.updateFeet(dt);
        if(this.trail.length===0||this.spine[Math.floor(this.segCount/2)].pos.distTo(this.trail[this.trail.length-1])>3){
            this.trail.push(this.spine[Math.floor(this.segCount/2)].pos.clone());
            if(this.trail.length>this.maxTrail)this.trail.shift();
        }
        this.calcForces(params);
    }
    updateFeet(dt){
        const sw=0.30;
        for(let i=0;i<4;i++){
            const foot=this.feet[i];const ai=this.limbAttach[i];const sp=this.spine[ai];
            const ps=this.limbPhaseOffset[i];const ph=this.gaitPhase;
            const inS=this.isInWindow(ph,ps,sw);
            if(inS){
                if(foot.swingProgress>=1){foot.prevPos=foot.pos.clone();foot.attached=false;
                    const td=sp.d+this.direction*this.strideLength*0.5;const tp=this.room.getPathPoint(td);
                    foot.targetPos=tp.pos.clone();foot.swingProgress=0;}
                const rp=this.windowProgress(ph,ps,sw);foot.swingProgress=this.ease(rp);
                const arc=Math.sin(foot.swingProgress*Math.PI)*12;
                foot.pos=foot.prevPos.lerp(foot.targetPos,foot.swingProgress).add(sp.normal.scale(arc));
                foot.attached=false;
                if(rp>=0.98){foot.pos=foot.targetPos.clone();foot.surfaceD=sp.d+this.direction*this.strideLength*0.5;foot.attached=true;foot.swingProgress=1;}
            }else{foot.attached=true;foot.swingProgress=1;}
        }
    }
    isInWindow(p,s,d){const e=(s+d)%1;if(s<e)return p>=s&&p<e;return p>=s||p<e;}
    windowProgress(p,s,d){let r=p-s;if(r<0)r+=1;return Math.min(r/d,1);}
    ease(t){return t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;}
    calcForces(params,falling=false){
        const g=params.gravity||9.8;const am=(params.adhesionStrength||100)/100;const wet=(params.wetness||0)/100;
        this.forces.gravity=new Vec2(0,this.geckoMass*g);
        let ta=new Vec2();
        for(let i=0;i<4;i++){
            if(this.feet[i].attached&&!falling){
                const sp=this.spine[this.limbAttach[i]];const ef=2.5*am*(1-wet*0.85);
                const fv=sp.normal.negate().scale(ef);this.forces.adhesionPerFoot[i]=fv;ta=ta.add(fv);
            }else{this.forces.adhesionPerFoot[i]=new Vec2();}
        }
        this.forces.totalAdhesion=ta;this.forces.net=this.forces.gravity.add(ta);
        if(!falling&&!this.room.getSurfaceName(this.headD).includes('Floor')){
            const ms=this.spine[Math.floor(this.segCount/2)];
            const pa=this.forces.gravity.dot(ms.normal);const sf=Math.abs(this.forces.gravity.dot(ms.tangent));
            const mu=this.room.getMaterial().roughness||0.85;
            let aa=0;for(let i=0;i<4;i++)if(this.feet[i].attached)aa+=2.5*am*(1-wet*0.85);
            const nh=pa<0?Math.abs(pa):0;
            if(pa>aa*0.95||sf>(aa+nh)*mu){this.isFalling=true;this.isMoving=false;this.fallVelocity=new Vec2();}
        }
    }
    solveIK(shoulder,foot,side){
        const dir=foot.sub(shoulder);const dist=Math.min(dir.length(),this.upperLen+this.lowerLen-1);
        if(dist<0.5)return shoulder.clone();
        const cosA=(this.upperLen*this.upperLen+dist*dist-this.lowerLen*this.lowerLen)/(2*this.upperLen*dist);
        const angleA=Math.acos(Math.max(-1,Math.min(1,cosA)));
        const base=dir.angle();const ka=base+angleA*side;
        return new Vec2(shoulder.x+Math.cos(ka)*this.upperLen,shoulder.y+Math.sin(ka)*this.upperLen);
    }
    getJointAngles(){
        const angles=[];
        for(let i=0;i<4;i++){
            const ai=this.limbAttach[i];const sp=this.spine[ai];
            const shoulder=sp.pos.add(sp.normal.scale(-this.bodyWidths[ai]*0.2));
            const knee=this.solveIK(shoulder,this.feet[i].pos,this.limbSide[i]);
            const shA=Math.atan2(knee.y-shoulder.y,knee.x-shoulder.x)*180/Math.PI;
            const elA=Math.atan2(this.feet[i].pos.y-knee.y,this.feet[i].pos.x-knee.x)*180/Math.PI;
            angles.push({shoulder:shA,elbow:elA,kneePos:knee,shoulderPos:shoulder});
        }
        return angles;
    }
}
