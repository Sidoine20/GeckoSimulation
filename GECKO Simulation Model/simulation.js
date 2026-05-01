/* GECKO APP — Main controller */
class App {
    constructor() {
        this.canvas = document.getElementById('sim-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        this.room = new Room(this.displayW, this.displayH);
        this.gecko = new Gecko(this.room, 'tokay');
        this.renderer = new Renderer(this.canvas, this.room, this.gecko, this.displayW, this.displayH);
        this.biomech = null; this.gaitR = null; this.humanR = null;
        this.activeTab = 'simulation';
        this.paused = false; this.lastTime = performance.now();
        this.frameCount = 0; this.fpsTime = 0; this.fps = 60;
        this.params = { gravity: 9.8, adhesionStrength: 100, wetness: 0 };
        this.bindUI(); this.bindKeys(); this.bindResize(); this.bindTabs();
        this.loop();
    }
    resizeCanvas() {
        const c = this.canvas, p = c.parentElement, dpr = window.devicePixelRatio || 1;
        const r = p.getBoundingClientRect();
        c.width = r.width * dpr; c.height = r.height * dpr;
        c.style.width = r.width + 'px'; c.style.height = r.height + 'px';
        this.ctx.scale(dpr, dpr); this.displayW = r.width; this.displayH = r.height;
    }
    bindResize() {
        let t; window.addEventListener('resize', () => {
            clearTimeout(t); t = setTimeout(() => {
                this.resizeCanvas();
                this.room = new Room(this.displayW, this.displayH);
                this.gecko.room = this.room; this.gecko.buildSpine(); this.gecko.initFeet();
                this.renderer.room = this.room; this.renderer.displayW = this.displayW; this.renderer.displayH = this.displayH;
                if (this.biomech) this.biomech.resize();
                if (this.gaitR) this.gaitR.resize();
                if (this.humanR) this.humanR.resize();
            }, 100);
        });
    }
    bindTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                const tab = btn.dataset.tab;
                document.getElementById('tab-' + tab).classList.add('active');
                this.activeTab = tab;
                // Lazy init renderers
                if (tab === 'biomechanics' && !this.biomech) {
                    this.biomech = new BiomechRenderer(
                        document.getElementById('biomech-canvas'),
                        document.getElementById('toepad-canvas'), this.gecko);
                    this.biomech.resize();
                }
                if (tab === 'gait' && !this.gaitR) {
                    this.gaitR = new GaitRenderer(
                        document.getElementById('gait-phase-canvas'),
                        document.getElementById('stride-canvas'), this.gecko);
                    setTimeout(() => this.gaitR.resize(), 50);
                }
                if (tab === 'human' && !this.humanR) {
                    this.humanR = new HumanRenderer(
                        document.getElementById('gecko-compare-canvas'),
                        document.getElementById('human-compare-canvas'),
                        document.getElementById('gait-compare-canvas'), this.gecko);
                    setTimeout(() => this.humanR.resize(), 50);
                }
                // Re-resize on tab switch
                setTimeout(() => {
                    if (tab === 'biomechanics' && this.biomech) this.biomech.resize();
                    if (tab === 'gait' && this.gaitR) this.gaitR.resize();
                    if (tab === 'human' && this.humanR) this.humanR.resize();
                }, 100);
            });
        });
    }
    bindUI() {
        const sl = (id, valId, cb) => {
            const s = document.getElementById(id), v = document.getElementById(valId);
            if (s) s.addEventListener('input', () => cb(s, v));
        };
        sl('slider-speed', 'val-speed', (s, v) => { this.gecko.speedMult = parseFloat(s.value); v.textContent = parseFloat(s.value).toFixed(1) + '×'; });
        sl('slider-gravity', 'val-gravity', (s, v) => { this.params.gravity = parseFloat(s.value); v.textContent = parseFloat(s.value).toFixed(1); });
        sl('slider-adhesion', 'val-adhesion', (s, v) => { this.params.adhesionStrength = parseFloat(s.value); v.textContent = Math.round(s.value) + '%'; });
        sl('slider-wetness', 'val-wetness', (s, v) => { this.params.wetness = parseFloat(s.value); v.textContent = Math.round(s.value) + '%'; });
        const surf = document.getElementById('select-surface');
        if (surf) surf.addEventListener('change', e => { this.room.surfaceMaterial = e.target.value; });
        const bpp = document.getElementById('btn-play-pause');
        if (bpp) bpp.addEventListener('click', () => this.togglePause());
        const bst = document.getElementById('btn-step');
        if (bst) bst.addEventListener('click', () => { if (!this.paused) this.togglePause(); this.gecko.update(1/60, this.params); });
        const brs = document.getElementById('btn-reset');
        if (brs) brs.addEventListener('click', () => this.reset());
        const brv = document.getElementById('btn-reverse');
        if (brv) brv.addEventListener('click', () => { this.gecko.direction *= -1; });
        const tog = (id, cb) => { const e = document.getElementById(id); if (e) e.addEventListener('change', cb); };
        tog('toggle-forces', e => { this.renderer.showForces = e.target.checked; });
        tog('toggle-setae', e => { this.renderer.showSetae = e.target.checked; });
        tog('toggle-grid', e => { this.renderer.showGrid = e.target.checked; });
        tog('toggle-trail', e => { this.renderer.showTrail = e.target.checked; });
        
        // Theme toggle
        const themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) {
            if (localStorage.getItem('theme') === 'light') {
                document.documentElement.classList.add('light-theme');
                themeBtn.textContent = '☀️';
            }
            themeBtn.addEventListener('click', () => {
                const isLight = document.documentElement.classList.toggle('light-theme');
                themeBtn.textContent = isLight ? '☀️' : '🌙';
                localStorage.setItem('theme', isLight ? 'light' : 'dark');
            });
        }

        // Species selector
        const sp = document.getElementById('select-species');
        if (sp) sp.addEventListener('change', e => {
            this.gecko.applySpecies(e.target.value);
            if (this.gaitR) this.gaitR.history = [];
        });
    }
    bindKeys() {
        window.addEventListener('keydown', e => {
            switch (e.key.toLowerCase()) {
                case ' ': e.preventDefault(); this.togglePause(); break;
                case 'f': document.getElementById('toggle-forces')?.click(); break;
                case 'r': this.reset(); break;
                case 'g': document.getElementById('toggle-grid')?.click(); break;
                case 'd': this.gecko.direction *= -1; break;
            }
        });
    }
    togglePause() {
        this.paused = !this.paused;
        if (!this.gecko.isFalling) this.gecko.isMoving = !this.paused;
        const btn = document.getElementById('btn-play-pause');
        if (btn) btn.textContent = this.paused ? '▶️' : '⏸️';
    }
    reset() {
        this.gecko.headD = this.room.w * 0.35; this.gecko.gaitPhase = 0;
        this.gecko.direction = 1; this.gecko.trail = [];
        this.gecko.isFalling = false; this.gecko.isMoving = true;
        this.gecko.buildSpine(); this.gecko.initFeet();
        if (this.paused) this.togglePause();
        if (this.gaitR) this.gaitR.history = [];
    }
    updateUI() {
        const g = this.gecko, hd = ((g.headD % this.room.perimeter) + this.room.perimeter) % this.room.perimeter;
        const pill = document.getElementById('status-pill'), st = document.getElementById('status-text');
        if (pill && st) {
            if (g.isFalling) { st.textContent = 'Falling!'; pill.className = 'status-pill falling'; }
            else if (this.paused) { st.textContent = 'Paused'; pill.className = 'status-pill paused'; }
            else { st.textContent = 'Running'; pill.className = 'status-pill'; }
        }
        const sn = this.room.getSurfaceName(hd);
        const el = (id, v) => { const e = document.getElementById(id); if (e) e.innerHTML = v; };
        el('data-surface', sn);
        el('surface-label', sn + ' — ' + this.room.surfaceMaterial.charAt(0).toUpperCase() + this.room.surfaceMaterial.slice(1));
        el('data-speed', Math.abs(g.speed * g.speedMult).toFixed(0) + ' <small>px/s</small>');
        el('data-gravity-force', g.forces.gravity.length().toFixed(2) + ' <small>N</small>');
        el('data-adhesion-force', g.forces.totalAdhesion.length().toFixed(2) + ' <small>N</small>');
        el('data-net-force', g.forces.net.length().toFixed(2) + ' <small>N</small>');
        const da = document.getElementById('data-feet'); if (da) da.textContent = g.feet.filter(f => f.attached).length + ' / 4';
        const gf = document.getElementById('gait-fill'); if (gf) gf.style.width = (g.gaitPhase * 100) + '%';
        const fp = document.getElementById('fps-display'); if (fp) fp.textContent = this.fps + ' FPS';
    }
    loop() {
        const now = performance.now(), dt = Math.min((now - this.lastTime) / 1000, 0.05);
        this.lastTime = now;
        this.frameCount++; this.fpsTime += dt;
        if (this.fpsTime >= 0.5) { this.fps = Math.round(this.frameCount / this.fpsTime); this.frameCount = 0; this.fpsTime = 0; }
        if (!this.paused) this.gecko.update(dt, this.params);
        // Render active tab
        if (this.activeTab === 'simulation') {
            this.ctx.save(); this.renderer.render(); this.ctx.restore();
        } else if (this.activeTab === 'biomechanics' && this.biomech) {
            this.biomech.render(dt);
        } else if (this.activeTab === 'gait' && this.gaitR) {
            this.gaitR.render();
        } else if (this.activeTab === 'human' && this.humanR) {
            this.humanR.render(dt);
        }
        this.updateUI();
        requestAnimationFrame(() => this.loop());
    }
}
window.addEventListener('DOMContentLoaded', () => { window.app = new App(); });
