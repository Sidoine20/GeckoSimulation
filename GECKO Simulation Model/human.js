/* Human Correlation tab renderer */
class HumanRenderer {
    constructor(geckoCanvas, humanCanvas, compareCanvas, gecko) {
        this.geckoCanvas = geckoCanvas; this.geckoCtx = geckoCanvas.getContext('2d');
        this.humanCanvas = humanCanvas; this.humanCtx = humanCanvas.getContext('2d');
        this.compareCanvas = compareCanvas; this.compareCtx = compareCanvas.getContext('2d');
        this.gecko = gecko; this.time = 0; this.walkCycle = 0;
    }
    resize() {
        [this.geckoCanvas, this.humanCanvas].forEach(c => {
            const p = c.parentElement, dpr = window.devicePixelRatio || 1;
            const r = p.getBoundingClientRect();
            c.width = r.width * dpr; c.height = (r.height - 40) * dpr;
            c.style.width = r.width + 'px'; c.style.height = (r.height - 40) + 'px';
            c.getContext('2d').scale(dpr, dpr);
        });
        const cc = this.compareCanvas, cp = cc.parentElement;
        const cr = cp.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        cc.width = (cr.width - 32) * dpr; cc.height = 120 * dpr;
        cc.style.width = (cr.width - 32) + 'px'; cc.style.height = '120px';
        cc.getContext('2d').scale(dpr, dpr);
    }
    render(dt) {
        this.time += dt; this.walkCycle = (this.walkCycle + dt * 1.5) % 1;
        this.drawGeckoView();
        this.drawHumanView();
        this.drawGaitCompare();
    }
    drawGeckoView() {
        const ctx = this.geckoCtx, c = this.geckoCanvas;
        const w = c.width / (window.devicePixelRatio || 1);
        const h = c.height / (window.devicePixelRatio || 1);
        if (!w || !h) return;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#0c0f16'; ctx.fillRect(0, 0, w, h);

        const cx = w / 2, cy = h / 2, g = this.gecko;
        if (g.spine.length < 2) return;
        const mid = g.spine[Math.floor(g.segCount / 2)].pos;
        const sc = 2;

        // Draw simplified gecko from above (top-down view)
        ctx.save();
        // Spine
        ctx.strokeStyle = 'rgba(0,229,160,0.4)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i < g.spine.length; i++) {
            const px = (g.spine[i].pos.x - mid.x) * sc + cx;
            const py = (g.spine[i].pos.y - mid.y) * sc + cy;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Limbs and feet
        const colors = ['#00e5a0', '#4daeff', '#ffb444', '#ff5c6a'];
        const labels = ['FL', 'FR', 'RL', 'RR'];
        const angles = g.getJointAngles();
        for (let i = 0; i < 4; i++) {
            const a = angles[i];
            const sx = (a.shoulderPos.x - mid.x) * sc + cx;
            const sy = (a.shoulderPos.y - mid.y) * sc + cy;
            const kx = (a.kneePos.x - mid.x) * sc + cx;
            const ky = (a.kneePos.y - mid.y) * sc + cy;
            const fx = (g.feet[i].pos.x - mid.x) * sc + cx;
            const fy = (g.feet[i].pos.y - mid.y) * sc + cy;

            ctx.strokeStyle = colors[i]; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();

            ctx.fillStyle = g.feet[i].attached ? colors[i] : colors[i] + '40';
            ctx.beginPath(); ctx.arc(fx, fy, 4, 0, Math.PI * 2); ctx.fill();
            ctx.font = '8px JetBrains Mono'; ctx.fillStyle = colors[i];
            ctx.textAlign = 'center'; ctx.fillText(labels[i], fx, fy - 8);
        }

        // Diagonal pair highlight
        const phase = g.gaitPhase;
        const pair1 = phase < 0.5; // FL+RR active
        ctx.font = '10px Inter'; ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.textAlign = 'center';
        ctx.fillText(pair1 ? 'Active: FL + RR (diagonal pair)' : 'Active: FR + RL (diagonal pair)', cx, h - 15);
        ctx.restore();
    }
    drawHumanView() {
        const ctx = this.humanCtx, c = this.humanCanvas;
        const w = c.width / (window.devicePixelRatio || 1);
        const h = c.height / (window.devicePixelRatio || 1);
        if (!w || !h) return;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#0c0f16'; ctx.fillRect(0, 0, w, h);

        const cx = w / 2, groundY = h - 40, t = this.walkCycle;

        // Walking human stick figure
        const hipY = groundY - 90;
        const shoulderY = hipY - 60;
        const headY = shoulderY - 25;

        // Trunk sway
        const sway = Math.sin(t * Math.PI * 2) * 3;

        // Head
        ctx.strokeStyle = '#4daeff'; ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(77,174,255,0.15)';
        ctx.beginPath(); ctx.arc(cx + sway, headY, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        // Spine/trunk
        ctx.beginPath(); ctx.moveTo(cx + sway, headY + 12); ctx.lineTo(cx + sway * 0.5, hipY); ctx.stroke();

        // Arms (counter-swing to legs)
        const armSwing = Math.sin(t * Math.PI * 2) * 25;
        // Left arm
        ctx.strokeStyle = '#00e5a0'; ctx.lineWidth = 2;
        const lShX = cx + sway - 12, lShY = shoulderY;
        ctx.beginPath(); ctx.moveTo(lShX, lShY);
        ctx.lineTo(lShX - 8, lShY + 30 + armSwing * 0.5);
        ctx.lineTo(lShX - 5, lShY + 55 + armSwing); ctx.stroke();
        // Right arm
        ctx.strokeStyle = '#ff5c6a';
        const rShX = cx + sway + 12;
        ctx.beginPath(); ctx.moveTo(rShX, lShY);
        ctx.lineTo(rShX + 8, lShY + 30 - armSwing * 0.5);
        ctx.lineTo(rShX + 5, lShY + 55 - armSwing); ctx.stroke();

        // Pelvis
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx + sway * 0.5 - 15, hipY); ctx.lineTo(cx + sway * 0.5 + 15, hipY); ctx.stroke();

        // Legs
        const legSwing = Math.sin(t * Math.PI * 2) * 30;
        const lHipX = cx + sway * 0.5 - 10;
        const rHipX = cx + sway * 0.5 + 10;

        // Left leg
        ctx.strokeStyle = '#00e5a0'; ctx.lineWidth = 2.5;
        const lKneeX = lHipX + legSwing * 0.3, lKneeY = hipY + 45;
        const lFootX = lHipX + legSwing, lFootY = groundY;
        const lLift = Math.max(0, Math.sin(t * Math.PI * 2)) * 8;
        ctx.beginPath(); ctx.moveTo(lHipX, hipY); ctx.lineTo(lKneeX, lKneeY); ctx.lineTo(lFootX, lFootY - lLift); ctx.stroke();
        ctx.fillStyle = lLift < 1 ? '#00e5a0' : '#00e5a060';
        ctx.beginPath(); ctx.arc(lFootX, lFootY - lLift, 4, 0, Math.PI * 2); ctx.fill();

        // Right leg
        ctx.strokeStyle = '#ff5c6a'; ctx.lineWidth = 2.5;
        const rKneeX = rHipX - legSwing * 0.3, rKneeY = hipY + 45;
        const rFootX = rHipX - legSwing, rFootY = groundY;
        const rLift = Math.max(0, -Math.sin(t * Math.PI * 2)) * 8;
        ctx.beginPath(); ctx.moveTo(rHipX, hipY); ctx.lineTo(rKneeX, rKneeY); ctx.lineTo(rFootX, rFootY - rLift); ctx.stroke();
        ctx.fillStyle = rLift < 1 ? '#ff5c6a' : '#ff5c6a60';
        ctx.beginPath(); ctx.arc(rFootX, rFootY - rLift, 4, 0, Math.PI * 2); ctx.fill();

        // Ground line
        ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(20, groundY + 2); ctx.lineTo(w - 20, groundY + 2); ctx.stroke();

        // Joint labels
        ctx.font = '8px JetBrains Mono'; ctx.textAlign = 'center';
        ctx.fillStyle = '#4daeff'; ctx.fillText('Shoulder', cx + sway, shoulderY - 8);
        ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillText('Hip', cx + sway * 0.5, hipY - 8);

        // Counter-swing label
        const active = t < 0.5;
        ctx.font = '10px Inter'; ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillText(active ? 'L-Leg + R-Arm forward' : 'R-Leg + L-Arm forward', cx, h - 10);
    }
    drawGaitCompare() {
        const ctx = this.compareCtx;
        const w = this.compareCanvas.width / (window.devicePixelRatio || 1);
        const h = 120;
        if (!w) return;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#0a0d12'; ctx.fillRect(0, 0, w, h);

        ctx.font = '10px Inter'; ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.textAlign = 'center'; ctx.fillText('Gait Phase Comparison: Gecko (top) vs Human (bottom)', w / 2, 14);

        const barX = 80, barW = w - 100, rowH = 18;
        // Gecko phases
        const geckoRows = [
            { label: 'FL', color: '#00e5a0', stance: [0, 0.5] },
            { label: 'RR', color: '#ff5c6a', stance: [0, 0.5] },
            { label: 'FR', color: '#4daeff', stance: [0.5, 1.0] },
            { label: 'RL', color: '#ffb444', stance: [0.5, 1.0] },
        ];
        const humanRows = [
            { label: 'L-Leg', color: '#00e5a0', stance: [0, 0.6] },
            { label: 'R-Leg', color: '#ff5c6a', stance: [0.5, 1.1] },
        ];

        let y = 26;
        ctx.font = '9px Inter'; ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.textAlign = 'left'; ctx.fillText('GECKO', 5, y + 16);
        geckoRows.forEach(row => {
            ctx.font = '8px JetBrains Mono'; ctx.fillStyle = row.color;
            ctx.textAlign = 'right'; ctx.fillText(row.label, barX - 5, y + 13);
            ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(barX, y, barW, rowH - 2);
            const s = row.stance[0] * barW, e = Math.min(row.stance[1], 1) * barW;
            ctx.fillStyle = row.color + '60'; ctx.fillRect(barX + s, y, e - s, rowH - 2);
            y += rowH;
        });

        y += 6;
        ctx.font = '9px Inter'; ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.textAlign = 'left'; ctx.fillText('HUMAN', 5, y + 10);
        humanRows.forEach(row => {
            ctx.font = '8px JetBrains Mono'; ctx.fillStyle = row.color;
            ctx.textAlign = 'right'; ctx.fillText(row.label, barX - 5, y + 13);
            ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(barX, y, barW, rowH - 2);
            const s = row.stance[0] * barW, e = Math.min(row.stance[1], 1) * barW;
            ctx.fillStyle = row.color + '60'; ctx.fillRect(barX + s, y, e - s, rowH - 2);
            y += rowH;
        });

        // Current phase indicator
        const px = barX + (this.walkCycle) * barW;
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
        ctx.beginPath(); ctx.moveTo(px, 24); ctx.lineTo(px, y); ctx.stroke();
        ctx.setLineDash([]);
    }
}
