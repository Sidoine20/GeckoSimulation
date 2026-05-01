/* Biomechanics tab renderer */
class BiomechRenderer {
    constructor(canvas, toeCanvas, gecko) {
        this.canvas = canvas; this.ctx = canvas.getContext('2d');
        this.toeCanvas = toeCanvas; this.toeCtx = toeCanvas.getContext('2d');
        this.gecko = gecko; this.time = 0;
    }
    resize() {
        const c = this.canvas, p = c.parentElement, dpr = window.devicePixelRatio || 1;
        const r = p.getBoundingClientRect();
        c.width = r.width * dpr; c.height = r.height * dpr;
        c.style.width = r.width + 'px'; c.style.height = r.height + 'px';
        this.ctx.scale(dpr, dpr); this.w = r.width; this.h = r.height;
        const tc = this.toeCanvas; tc.width = 280; tc.height = 160;
    }
    render(dt) {
        this.time += dt;
        const ctx = this.ctx, w = this.w, h = this.h, g = this.gecko;
        if (!w || !h) return;
        ctx.clearRect(0, 0, w, h);
        // Background
        const bg = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w*0.6);
        bg.addColorStop(0, '#141824'); bg.addColorStop(1, '#0b0e14');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

        this.drawSkeletonView(ctx, w, h, g);
        this.drawForceDecomposition(ctx, w, h, g);
        this.drawCoMTracker(ctx, w, h, g);
        this.drawToePad();
        this.updateUI(g);
    }
    drawSkeletonView(ctx, w, h, g) {
        const cx = w * 0.3, cy = h * 0.4, scale = 2.5;
        ctx.save();
        ctx.font = '11px Inter'; ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.textAlign = 'center'; ctx.fillText('SKELETAL VIEW — Joint Angles', cx, 30);

        if (g.spine.length < 2) { ctx.restore(); return; }
        // Draw spine as chain
        const sp = g.spine, mid = sp[Math.floor(sp.length / 2)].pos;
        const ox = cx - mid.x * scale + mid.x, oy = cy - mid.y * scale + mid.y;

        // Spine line
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < sp.length; i++) {
            const px = (sp[i].pos.x - mid.x) * scale + cx;
            const py = (sp[i].pos.y - mid.y) * scale + cy;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Vertebrae dots
        for (let i = 0; i < sp.length; i += 2) {
            const px = (sp[i].pos.x - mid.x) * scale + cx;
            const py = (sp[i].pos.y - mid.y) * scale + cy;
            ctx.fillStyle = 'rgba(167,139,250,0.4)';
            ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
        }

        // Draw limbs with angle arcs
        const angles = g.getJointAngles();
        const colors = ['#00e5a0', '#4daeff', '#ffb444', '#ff5c6a'];
        const labels = ['FL', 'FR', 'RL', 'RR'];
        for (let i = 0; i < 4; i++) {
            const a = angles[i];
            const sx = (a.shoulderPos.x - mid.x) * scale + cx;
            const sy = (a.shoulderPos.y - mid.y) * scale + cy;
            const kx = (a.kneePos.x - mid.x) * scale + cx;
            const ky = (a.kneePos.y - mid.y) * scale + cy;
            const fx = (g.feet[i].pos.x - mid.x) * scale + cx;
            const fy = (g.feet[i].pos.y - mid.y) * scale + cy;

            // Limb lines
            ctx.strokeStyle = colors[i]; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();

            // Joint circles
            ctx.fillStyle = colors[i];
            ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(kx, ky, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = g.feet[i].attached ? '#00e5a0' : '#ff5c6a';
            ctx.beginPath(); ctx.arc(fx, fy, 3, 0, Math.PI * 2); ctx.fill();

            // Angle arc at knee
            const aUp = Math.atan2(sy - ky, sx - kx);
            const aDown = Math.atan2(fy - ky, fx - kx);
            ctx.strokeStyle = colors[i] + '60'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(kx, ky, 12, Math.min(aUp, aDown), Math.max(aUp, aDown)); ctx.stroke();

            // Label
            ctx.font = '9px JetBrains Mono'; ctx.fillStyle = colors[i];
            ctx.textAlign = 'center'; ctx.fillText(labels[i], sx, sy - 8);
        }
        ctx.restore();
    }
    drawForceDecomposition(ctx, w, h, g) {
        const cx = w * 0.72, cy = h * 0.35, r = 60;
        ctx.save();
        ctx.font = '11px Inter'; ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.textAlign = 'center'; ctx.fillText('FORCE DECOMPOSITION', cx, cy - r - 20);

        // Circle representing gecko body cross-section
        ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

        // Gravity (down)
        const gf = g.forces.gravity.length() * 30;
        ctx.strokeStyle = '#ff5c6a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + Math.min(gf, r * 1.5)); ctx.stroke();
        ctx.fillStyle = '#ff5c6a'; ctx.font = '9px JetBrains Mono';
        ctx.fillText('Fg=' + g.forces.gravity.length().toFixed(2) + 'N', cx + 30, cy + Math.min(gf, r));

        // Adhesion (up/toward surface)
        const af = g.forces.totalAdhesion.length() * 10;
        if (af > 0.1) {
            const an = g.forces.totalAdhesion.normalize();
            ctx.strokeStyle = '#00e5a0'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(cx, cy);
            ctx.lineTo(cx + an.x * Math.min(af, r * 1.5), cy + an.y * Math.min(af, r * 1.5)); ctx.stroke();
            ctx.fillStyle = '#00e5a0';
            ctx.fillText('Fa=' + g.forces.totalAdhesion.length().toFixed(2) + 'N', cx + an.x * r + 20, cy + an.y * r);
        }

        // Net force
        const nf = g.forces.net;
        if (nf.length() > 0.01) {
            const nn = nf.normalize();
            ctx.strokeStyle = '#ffdd44'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
            ctx.beginPath(); ctx.moveTo(cx, cy);
            ctx.lineTo(cx + nn.x * Math.min(nf.length() * 20, r), cy + nn.y * Math.min(nf.length() * 20, r)); ctx.stroke();
            ctx.setLineDash([]);
        }

        // Support polygon indicator
        ctx.font = '10px Inter'; ctx.fillStyle = 'rgba(255,255,255,0.2)';
        const attached = g.feet.filter(f => f.attached).length;
        ctx.fillText('Support: ' + attached + '/4 feet', cx, cy + r + 30);
        ctx.restore();
    }
    drawCoMTracker(ctx, w, h, g) {
        const cx = w * 0.5, cy = h * 0.78, bw = w * 0.6, bh = 40;
        ctx.save();
        ctx.font = '11px Inter'; ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.textAlign = 'center'; ctx.fillText('CENTER OF MASS STABILITY', cx, cy - 30);

        // Background bar
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(cx - bw/2, cy, bw, bh);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
        ctx.strokeRect(cx - bw/2, cy, bw, bh);

        // CoM position relative to support polygon
        const comX = g.spine[Math.floor(g.segCount / 2)].pos.x;
        const feet = g.feet.filter(f => f.attached);
        let minX = comX, maxX = comX;
        feet.forEach(f => { minX = Math.min(minX, f.pos.x); maxX = Math.max(maxX, f.pos.x); });
        const range = maxX - minX || 1;
        const comRel = (comX - minX) / range;

        // Support polygon fill
        ctx.fillStyle = 'rgba(0,229,160,0.1)';
        ctx.fillRect(cx - bw/2 + bw * 0.1, cy, bw * 0.8, bh);

        // CoM dot
        const dotX = cx - bw/2 + bw * Math.max(0.05, Math.min(0.95, comRel));
        ctx.fillStyle = '#ffdd44';
        ctx.beginPath(); ctx.arc(dotX, cy + bh/2, 6, 0, Math.PI * 2); ctx.fill();
        ctx.font = '8px JetBrains Mono'; ctx.fillStyle = '#ffdd44';
        ctx.fillText('CoM', dotX, cy + bh + 14);

        // Foot markers
        ctx.fillStyle = '#00e5a0'; ctx.font = '8px JetBrains Mono';
        feet.forEach((f, i) => {
            const fx = cx - bw/2 + bw * ((f.pos.x - minX) / range);
            ctx.beginPath(); ctx.arc(fx, cy + bh/2, 3, 0, Math.PI * 2); ctx.fill();
        });
        ctx.restore();
    }
    drawToePad() {
        const ctx = this.toeCtx, w = 280, h = 160;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#0a0d12'; ctx.fillRect(0, 0, w, h);

        // Lamella ridges
        const t = this.time;
        for (let i = 0; i < 8; i++) {
            const y = 30 + i * 15;
            ctx.strokeStyle = `rgba(0,229,160,${0.15 + Math.sin(t * 2 + i) * 0.05})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let x = 20; x < 260; x += 2) {
                const yy = y + Math.sin(x * 0.1 + t) * 2;
                x === 20 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
            }
            ctx.stroke();

            // Setae hairs
            for (let j = 0; j < 12; j++) {
                const sx = 30 + j * 20;
                const sy = y + 2;
                const sLen = 8 + Math.sin(t * 3 + i + j) * 2;
                ctx.strokeStyle = `rgba(100,200,140,${0.2 + Math.sin(t + j) * 0.1})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.sin(t + j) * 1, sy + sLen); ctx.stroke();

                // Spatula tips
                ctx.fillStyle = 'rgba(0,229,160,0.3)';
                ctx.beginPath(); ctx.arc(sx + Math.sin(t + j), sy + sLen, 1, 0, Math.PI * 2); ctx.fill();
            }
        }

        ctx.font = '9px Inter'; ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.textAlign = 'center'; ctx.fillText('Lamellae → Setae → Spatulae (animated)', 140, 152);
    }
    updateUI(g) {
        const angles = g.getJointAngles();
        const ids = [['ja-fl-sh','ja-fl-el'],['ja-fr-sh','ja-fr-el'],['ja-rl-hp','ja-rl-kn'],['ja-rr-hp','ja-rr-kn']];
        for (let i = 0; i < 4; i++) {
            const sh = document.getElementById(ids[i][0]);
            const el = document.getElementById(ids[i][1]);
            if (sh) sh.textContent = Math.round(angles[i].shoulder) + '°';
            if (el) el.textContent = Math.round(angles[i].elbow) + '°';
        }
        // Force decomposition
        const ms = g.spine[Math.floor(g.segCount / 2)];
        const normalF = g.forces.gravity.dot(ms.normal);
        const tangF = Math.abs(g.forces.gravity.dot(ms.tangent));
        const fricF = tangF * (g.room.getMaterial().roughness || 0.85);
        const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        el('fd-normal', normalF.toFixed(3) + ' N');
        el('fd-tangential', tangF.toFixed(3) + ' N');
        el('fd-friction', fricF.toFixed(3) + ' N');
        const attached = g.feet.filter(f => f.attached).length;
        el('fd-com', attached >= 3 ? 'Stable' : attached >= 2 ? 'Marginal' : 'Unstable');

        // Muscle activation bars
        const mIds = ['mf-fl', 'mf-fr', 'mf-rl', 'mf-rr'];
        for (let i = 0; i < 4; i++) {
            const bar = document.getElementById(mIds[i]);
            if (bar) {
                const active = !g.feet[i].attached ? 0.9 : 0.2;
                bar.style.width = (active * 100) + '%';
                bar.style.background = active > 0.5 ? '#ff5c6a' : '#00e5a0';
            }
        }
    }
}
