'use strict';

// ══ THREE.JS SCENE — 4 libros simétricos ════════════════════════
class FolioScene {
    constructor() {
        const c = document.getElementById('three-canvas');
        if (!c || typeof THREE === 'undefined') return;
        this.canvas = c;
        this.W = c.offsetWidth || window.innerWidth * 0.58;
        this.H = c.offsetHeight || window.innerHeight;
        this.mouse = new THREE.Vector2();
        this.targetMouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.bookMeshes = [];
        this.clock = new THREE.Clock();
        this._setup();
        this._lights();
        this._particles();
        this._events();
        this._animate();
    }

    _setup() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: false
        });
        this.renderer.setSize(this.W, this.H);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(48, this.W / this.H, 0.1, 100);
        this.camera.position.set(0, 0, 9);
    }

    _lights() {
        this.scene.add(new THREE.AmbientLight(0x111130, 2.2));
        const key = new THREE.PointLight(0xc9a84c, 5, 18);
        key.position.set(4, 6, 5);
        this.scene.add(key);
        const rim = new THREE.PointLight(0x3355cc, 2.5, 14);
        rim.position.set(-6, -1, 3);
        this.scene.add(rim);
        const fill = new THREE.DirectionalLight(0x221122, 0.8);
        fill.position.set(0, -5, 4);
        this.scene.add(fill);
    }

    _parseColors(s) {
        const m = s.match(/#[0-9a-fA-F]{6}/g);
        return m && m.length >= 2 ? [m[0], m[1]] : ['#2a2a35','#111115'];
    }

    _coverTex(book) {
        // 1. Crear el Canvas Base (Fondo elegante temporal/respaldo)
        const cv = document.createElement('canvas');
        cv.width = 512; cv.height = 768;
        const ctx = cv.getContext('2d');
        const tex = new THREE.CanvasTexture(cv);
        tex.anisotropy = 16;

        // Pintamos el diseño elegante SIEMPRE primero
        const [c1, c2] = this._parseColors(book.color || 'linear-gradient(135deg,#222,#000)');
        const g = ctx.createLinearGradient(0, 0, 512, 768);
        g.addColorStop(0, c1); g.addColorStop(1, c2);
        ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 768);

        ctx.fillStyle = 'rgba(201,168,76,0.8)'; ctx.fillRect(40, 40, 6, 150);
        ctx.font = 'bold 40px Georgia, serif'; ctx.fillStyle = 'white';
        ctx.fillText((book.title || '').substring(0, 20), 40, 600);
        ctx.font = '20px monospace'; ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText((book.author || '').substring(0, 30), 40, 640);

        if (!book.isbn) return tex;

        // 2. Método Infalible: Cargar la imagen vía Fetch y Blob
        const url = `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg?default=false`;

        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error('Imagen no encontrada');
                return response.blob();
            })
            .then(blob => {
                // Creamos una URL local temporal a partir del Blob
                const localUrl = URL.createObjectURL(blob);
                const img = new Image();
                img.onload = () => {
                    // Si la imagen cargada es real (no un pixel transparente)
                    if (img.width > 10) {
                        ctx.drawImage(img, 0, 0, 512, 768);
                        tex.needsUpdate = true;
                    }
                    // Liberamos memoria
                    URL.revokeObjectURL(localUrl);
                };
                img.src = localUrl;
            })
            .catch(err => {
                // Si la descarga falla silenciosamente, se queda el Canvas elegante
                console.log(`[INFO] No se pudo cargar portada para ${book.title}`);
            });

        return tex;
    }

    _spineTex(book) {
        const cv = document.createElement('canvas');
        cv.width = 64; cv.height = 384;
        const ctx = cv.getContext('2d');
        const [c1, c2] = this._parseColors(book.color);
        const g = ctx.createLinearGradient(0, 0, 0, 384);
        g.addColorStop(0, c1); g.addColorStop(1, c2);
        ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 384);
        ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(0, 0, 64, 384);
        ctx.fillStyle = '#c9a84c'; ctx.fillRect(0, 0, 2, 384);
        ctx.save();
        ctx.translate(32, 192);
        ctx.rotate(-Math.PI / 2);
        ctx.font = 'bold 14px Georgia,serif';
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.textAlign = 'center';
        ctx.fillText(book.title.substring(0, 20), 0, 5);
        ctx.restore();
        return new THREE.CanvasTexture(cv);
    }

    _makeBook(book, pos, rot) {
        const [c1] = this._parseColors(book.color);
        const backC = new THREE.Color(c1).multiplyScalar(0.35);
        const mats = [
            new THREE.MeshPhongMaterial({ color: 0xf0e8d8, shininess: 8 }),
            new THREE.MeshPhongMaterial({ map: this._spineTex(book), shininess: 50 }),
            new THREE.MeshPhongMaterial({ color: 0xe8e0d0, shininess: 8 }),
            new THREE.MeshPhongMaterial({ color: 0xe0d8c8, shininess: 8 }),
            new THREE.MeshPhongMaterial({ map: this._coverTex(book), shininess: 70 }),
            new THREE.MeshPhongMaterial({ color: backC, shininess: 30 }),
        ];
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.9, 0.19), mats);
        mesh.castShadow = true;
        mesh.userData = { bookId: book.id };
        const group = new THREE.Group();
        group.add(mesh);
        group.position.set(pos.x, pos.y, pos.z);
        group.rotation.set(rot.x, rot.y, rot.z);
        this.scene.add(group);
        this.bookMeshes.push({ group, mesh, baseY: pos.y, phase: Math.random() * Math.PI * 2 });
        return group;
    }

    _books() {
        // 4 libros distribuidos simétricamente alrededor del eje vertical.
        // Pares espejo: extremos arriba (y=0.7), centro abajo (y=-0.7) — efecto V invertida.
        const positions = [
            { x: -3.3, y:  0.7, z: 0.1 },  // Extremo izquierdo
            { x: -1.1, y: -0.7, z: 0.6 },  // Centro-izquierda
            { x:  1.1, y: -0.7, z: 0.6 },  // Centro-derecha (espejo)
            { x:  3.3, y:  0.7, z: 0.1 }   // Extremo derecho (espejo)
        ];

        // Rotaciones simétricas: los exteriores miran ligeramente al centro
        const rotations = [
            { x:  0.06, y:  0.32,  z: -0.04 },
            { x: -0.04, y:  0.14,  z:  0.03 },
            { x: -0.04, y: -0.14,  z: -0.03 },
            { x:  0.06, y: -0.32,  z:  0.04 }
        ];

        BOOKS.slice(0, 4).forEach((b, i) => this._makeBook(
            b,
            new THREE.Vector3(positions[i].x, positions[i].y, positions[i].z),
            new THREE.Euler(rotations[i].x, rotations[i].y, rotations[i].z)
        ));
    }

    // Método para reconstruir los libros cuando llegan los datos de Supabase
    updateBooks() {
        // Borramos los libros falsos anteriores
        this.bookMeshes.forEach(b => this.scene.remove(b.group));
        this.bookMeshes = [];
        // Volvemos a crear los libros, pero ahora con la variable BOOKS que ya tiene los ISBN reales
        this._books();
    }


    _particles() {
        const n = 100, pos = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
            pos[i*3]   = (Math.random()-.5)*13;
            pos[i*3+1] = (Math.random()-.5)*10;
            pos[i*3+2] = (Math.random()-.5)*5;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        this.particles = new THREE.Points(g, new THREE.PointsMaterial({
            color: 0xc9a84c, size: 0.035, transparent: true, opacity: .45, sizeAttenuation: true
        }));
        this.scene.add(this.particles);
    }

    _events() {
        const getMousePos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            return {
                x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
                y: -((e.clientY - rect.top) / rect.height) * 2 + 1
            };
        };

        this.mouseMoved = false;
        this.hitsCache = [];

        window.addEventListener('mousemove', e => {
            const pos = getMousePos(e);
            this.targetMouse.x = pos.x;
            this.targetMouse.y = pos.y;
            this.mouseMoved = true;
        }, { passive: true });

        this.canvas.addEventListener('click', (e) => {
            const pos = getMousePos(e);
            const exactMouse = new THREE.Vector2(pos.x, pos.y);
            this.raycaster.setFromCamera(exactMouse, this.camera);
            const hits = this.raycaster.intersectObjects(this.bookMeshes.map(b => b.mesh));
            if (hits.length) {
                const id = hits[0].object.userData.bookId;
                if (id && typeof openBookModalById === 'function') openBookModalById(id);
            }
        });

        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.W = this.canvas.offsetWidth;
                this.H = this.canvas.offsetHeight;
                this.camera.aspect = this.W / this.H;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(this.W, this.H);
            }, 150);
        });
    }

    _animate() {
        requestAnimationFrame(() => this._animate());
        if (document.hidden) return;

        const t = this.clock.getElapsedTime();
        this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.06;
        this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.06;
        this.camera.position.x += (this.mouse.x * 0.9 - this.camera.position.x) * 0.04;
        this.camera.position.y += (this.mouse.y * 0.55 - this.camera.position.y) * 0.04;
        this.camera.lookAt(0, 0, 0);

        this.bookMeshes.forEach(({ group, phase }) => {
            group.position.y += Math.sin(t * 0.45 + phase) * 0.0025;
            group.children[0].rotation.y += 0.008;
        });

        if (this.particles) this.particles.rotation.y = t * 0.018;

        if (this.mouseMoved) {
            this.raycaster.setFromCamera(this.mouse, this.camera);
            this.hitsCache = this.raycaster.intersectObjects(this.bookMeshes.map(b => b.mesh));
            this.mouseMoved = false;
        }

        this.bookMeshes.forEach(({ group }) => {
            const target = this.hitsCache.length && this.hitsCache[0].object.parent === group ? 1.09 : 1.0;
            group.scale.lerp(new THREE.Vector3(target, target, target), 0.12);
        });

        this.canvas.style.cursor = this.hitsCache.length ? 'pointer' : 'default';
        this.renderer.render(this.scene, this.camera);
    }
}

window.FolioScene = FolioScene;