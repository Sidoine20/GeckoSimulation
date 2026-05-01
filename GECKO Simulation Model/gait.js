/* Gait Analysis tab renderer */
class GaitRenderer {
    constructor(phaseCanvas, strideCanvas, gecko) {
        this.phaseCanvas = phaseCanvas; this.phaseCtx = phaseCanvas.getContext('2d');
        this.strideCanvas = strideCanvas; this.strideCtx = strideCanvas.getContext('2d');
        this.gecko = gecko; this.history = []; this.maxHistory = 200;
    }
    resize() {
        [this.phaseCanvas, this.strideCanvas].forEach(c => {
            const p = c.parentElement, dpr = window.devicePixelRatio || 1;
            const r = p.getBoundingClientRect();
            c.width = (r.width - 28) * dpr; c.height = (r.height - 50) * dpr;
            c.style.width = (r.width - 28) + 'px'; c.style.height = (r.height - 50) + 'px';
            c.getContext('2d').scale(dpr, dpr);
        });
        this.pw = this.phaseCanvas.width / (window.devicePixelRatio || 1);
        this.ph = this.phaseCanvas.height / (window.devicePixelRatio || 1);
        this.sw = this.strideCanvas.width / (window.devicePixelRatio || 1);
        this.sh = this.strideCanvas.height / (window.devicePixelRatio || 1);
    }
    record() {
        const g = this.gecko;
        this.history.push({ phase: g.gaitPhase, feet: g.feet.map(f => f.attached), time: performance.now() });
        if (this.history.length > this.maxHistory) this.history.shift();
    }
    render() {
        this.record();
        this.drawPhase();
        this.drawStride();
        this.updateSpeciesCard();
    }
    drawPhase() {
        const ctx = this.phaseCtx, w = this.pw, h = this.ph;
        if (!w || !h) return;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#0a0d12'; ctx.fillRect(0, 0, w, h);
        const labels = ['Front-Left', 'Front-Right', 'Rear-Left', 'Rear-Right'];
        const colors = ['#00e5a0', '#4daeff', '#ffb444', '#ff5c6a'];
        const trackH = (h - 60) / 4, startY = 35;

        ctx.font = '10px Inter'; ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.textAlign = 'center'; ctx.fillText('Gait Phase Diagram — Stance (filled) / Swing (empty)', w / 2, 18);

        for (let t = 0; t < 4; t++) {
            const ty = startY + t * trackH;
            // Label
            ctx.font = '9px JetBrains Mono'; ctx.fillStyle = colors[t];
            ctx.textAlign = 'right'; ctx.fillText(labels[t], 85, ty + trackH / 2 + 3);
            // Track background
            ctx.fillStyle = 'rgba(255,255,255,0.03)';
            ctx.fillRect(95, ty + 4, w - 110, trackH - 8);
            // History bars
            const barW = (w - 110) / this.maxHistory;
            for (let i = 0; i < this.history.length; i++) {
                const attached = this.history[i].feet[t];
                ctx.fillStyle = attached ? colors[t] + '80' : 'rgba(255,255,255,0.02)';
                ctx.fillRect(95 + i * barW, ty + 4, barW + 0.5, trackH - 8);
            }
            // Current state indicator
            const attached = this.gecko.feet[t].attached;
            ctx.fillStyle = attached ? colors[t] : 'rgba(255,255,255,0.15)';
            ctx.beginPath(); ctx.arc(w - 8, ty + trackH / 2, 5, 0, Math.PI * 2); ctx.fill();
        }
        // Phase indicator line
        const px = 95 + (this.history.length - 1) / this.maxHistory * (w - 110);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px, startY); ctx.lineTo(px, startY + 4 * trackH); ctx.stroke();
    }
    drawStride() {
        const ctx = this.strideCtx, w = this.sw, h = this.sh;
        if (!w || !h) return;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#0a0d12'; ctx.fillRect(0, 0, w, h);

        ctx.font = '10px Inter'; ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.textAlign = 'center'; ctx.fillText('Species Stride Comparison', w / 2, 18);

        const species = ['tokay', 'crested', 'leopard', 'daygecko'];
        const sNames = ['Tokay', 'Crested', 'Leopard', 'Day'];
        const colors = ['#00e5a0', '#4daeff', '#ffb444', '#a78bfa'];
        const metrics = [
            { label: 'Speed (m/s)', key: s => parseFloat(SPECIES[s].maxSpeed) },
            { label: 'Stride (cm)', key: s => SPECIES[s].strideLength / 2.5 },
            { label: 'Duty Factor', key: s => SPECIES[s].dutyFactor },
        ];
        const groupW = (w - 80) / metrics.length;
        const barW = groupW / (species.length + 1);
        const chartTop = 40, chartBot = h - 30;
        const chartH = chartBot - chartTop;

        // Y axis
        ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(60, chartTop); ctx.lineTo(60, chartBot); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(60, chartBot); ctx.lineTo(w - 10, chartBot); ctx.stroke();

        for (let m = 0; m < metrics.length; m++) {
            const gx = 70 + m * groupW;
            const maxVal = Math.max(...species.map(s => metrics[m].key(s))) * 1.2;

            // Group label
            ctx.font = '9px Inter'; ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.textAlign = 'center';
            ctx.fillText(metrics[m].label, gx + groupW / 2 - barW / 2, chartBot + 18);

            for (let s = 0; s < species.length; s++) {
                const val = metrics[m].key(species[s]);
                const barH = (val / maxVal) * chartH * 0.85;
                const bx = gx + s * barW;
                const by = chartBot - barH;

                // Bar
                const grad = ctx.createLinearGradient(bx, by, bx, chartBot);
                grad.addColorStop(0, colors[s]); grad.addColorStop(1, colors[s] + '30');
                ctx.fillStyle = grad;
                ctx.fillRect(bx, by, barW - 2, barH);

                // Highlight active species
                if (species[s] === this.gecko.speciesKey) {
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
                    ctx.strokeRect(bx, by, barW - 2, barH);
                }

                // Value label
                ctx.font = '8px JetBrains Mono'; ctx.fillStyle = colors[s];
                ctx.textAlign = 'center';
                ctx.fillText(val.toFixed(1), bx + (barW - 2) / 2, by - 4);
            }
        }
        // Legend
        const ly = chartTop - 5;
        for (let s = 0; s < species.length; s++) {
            const lx = w - 180 + s * 45;
            ctx.fillStyle = colors[s];
            ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2); ctx.fill();
            ctx.font = '8px Inter'; ctx.textAlign = 'left';
            ctx.fillText(sNames[s], lx + 6, ly + 3);
        }
    }
    updateSpeciesCard() {
        const sp = SPECIES[this.gecko.speciesKey]; if (!sp) return;
        const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        el('species-name', sp.name); el('species-sci', sp.sci);
        el('sp-length', sp.length); el('sp-mass', sp.mass);
        el('sp-speed', sp.maxSpeed); el('sp-gait', sp.gaitName);
        el('sp-adhesion', sp.adhesionLabel); el('sp-habitat', sp.habitat);
        el('sp-toepads', sp.toePads); el('sp-duty', sp.dutyFactor.toFixed(2));
    }
}
