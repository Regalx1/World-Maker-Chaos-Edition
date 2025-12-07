import * as THREE from 'https://esm.sh/three@0.169.0';
import { OrbitControls } from 'https://esm.sh/three@0.169.0/examples/jsm/controls/OrbitControls';

const canvas = document.getElementById('canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 50, 200);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(30, 25, 30);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 15;
controls.maxDistance = 100;
controls.maxPolarAngle = Math.PI / 2.1;

// Lighting
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(50, 50, 50);
sun.castShadow = true;
sun.shadow.camera.left = -50;
sun.shadow.camera.right = 50;
sun.shadow.camera.top = 50;
sun.shadow.camera.bottom = -50;
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

// Ground
const groundGeo = new THREE.CircleGeometry(50, 64);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x4a7c3f });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Game state
let currentMode = 'road';
let objects = [];
let cars = [];
let gravityEnabled = true;
let shakeIntensity = 0;
let bounceMode = false;
let npcs = [];
let npcMode = 'wander'; // wander, panic, dance, freeze;

// Build mode handlers
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(ground);

    if (intersects.length > 0) {
        const point = intersects[0].point;
        buildObject(currentMode, point);
    }
});

function buildObject(type, position) {
    let mesh;

    switch(type) {
        case 'road':
            const roadGeo = new THREE.BoxGeometry(2, 0.1, 8);
            const roadMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
            mesh = new THREE.Mesh(roadGeo, roadMat);
            mesh.position.set(position.x, 0.05, position.z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            break;

        case 'building':
            const height = 3 + Math.random() * 5;
            const buildingGeo = new THREE.BoxGeometry(3, height, 3);
            const buildingMat = new THREE.MeshStandardMaterial({ 
                color: new THREE.Color().setHSL(Math.random(), 0.3, 0.6)
            });
            mesh = new THREE.Mesh(buildingGeo, buildingMat);
            mesh.position.set(position.x, height / 2, position.z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            break;

        case 'car':
            mesh = createCar();
            mesh.position.set(position.x, 0.5, position.z);
            mesh.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                0,
                (Math.random() - 0.5) * 0.1
            );
            cars.push(mesh);
            break;

        case 'tree':
            const treeGroup = new THREE.Group();
            const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 2);
            const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3020 });
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = 1;

            const leavesGeo = new THREE.SphereGeometry(1.5, 8, 8);
            const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2d5016 });
            const leaves = new THREE.Mesh(leavesGeo, leavesMat);
            leaves.position.y = 3;

            treeGroup.add(trunk);
            treeGroup.add(leaves);
            mesh = treeGroup;
            mesh.position.set(position.x, 0, position.z);
            trunk.castShadow = true;
            leaves.castShadow = true;
            break;

        case 'npc':
            mesh = createNPC();
            mesh.position.set(position.x, 0, position.z);
            mesh.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.05,
                0,
                (Math.random() - 0.5) * 0.05
            );
            mesh.userData.target = null;
            mesh.userData.dancePhase = Math.random() * Math.PI * 2;
            npcs.push(mesh);
            break;
    }

    if (mesh) {
        mesh.userData.type = type;
        scene.add(mesh);
        objects.push(mesh);
    }
}

function createCar() {
    const carGroup = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(1.5, 0.6, 0.8);
    const bodyMat = new THREE.MeshStandardMaterial({ 
        color: new THREE.Color().setHSL(Math.random(), 0.8, 0.5)
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.3;
    body.castShadow = true;

    const cabinGeo = new THREE.BoxGeometry(0.8, 0.4, 0.7);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0.2, 0.7, 0);
    cabin.castShadow = true;

    carGroup.add(body);
    carGroup.add(cabin);

    return carGroup;
}

function createNPC() {
    const npcGroup = new THREE.Group();

    // Body
    const bodyGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ 
        color: new THREE.Color().setHSL(Math.random(), 0.6, 0.5)
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.3;
    body.castShadow = true;

    // Head
    const headGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.75;
    head.castShadow = true;

    npcGroup.add(body);
    npcGroup.add(head);

    return npcGroup;
}

// Chaos effects
function activateChaos(type) {
    switch(type) {
        case 'tornado':
            createTornado();
            break;
        case 'meteor':
            spawnMeteor();
            break;
        case 'earthquake':
            shakeIntensity = 2;
            setTimeout(() => shakeIntensity = 0, 3000);
            break;
        case 'cars':
            for (let i = 0; i < 50; i++) {
                const angle = (i / 50) * Math.PI * 2;
                const radius = 20 + Math.random() * 10;
                const pos = new THREE.Vector3(
                    Math.cos(angle) * radius,
                    0.5,
                    Math.sin(angle) * radius
                );
                const car = createCar();
                car.position.copy(pos);
                car.userData.velocity = new THREE.Vector3(
                    (Math.random() - 0.5) * 0.2,
                    0,
                    (Math.random() - 0.5) * 0.2
                );
                scene.add(car);
                cars.push(car);
                objects.push(car);
            }
            break;
        case 'gravity':
            gravityEnabled = !gravityEnabled;
            if (!gravityEnabled) {
                objects.forEach(obj => {
                    if (!obj.userData.velocity) {
                        obj.userData.velocity = new THREE.Vector3();
                    }
                    obj.userData.velocity.y = Math.random() * 0.2;
                });
            }
            break;
        case 'explode':
            objects.forEach(obj => {
                const dir = obj.position.clone().normalize();
                if (!obj.userData.velocity) {
                    obj.userData.velocity = new THREE.Vector3();
                }
                obj.userData.velocity.add(dir.multiplyScalar(0.5));
                obj.userData.velocity.y = 0.3;
            });
            break;
        case 'bounce':
            bounceMode = !bounceMode;
            document.getElementById('mode-indicator').textContent = bounceMode ? 'BOUNCE MODE 🎾' : `BUILD: ${currentMode.toUpperCase()}`;
            break;
        case 'giant':
            objects.forEach(obj => {
                const targetScale = obj.userData.originalScale ? 1 : 3;
                if (!obj.userData.originalScale) {
                    obj.userData.originalScale = obj.scale.clone();
                }
                obj.scale.set(targetScale, targetScale, targetScale);
            });
            break;
    }
}

function createTornado() {
    const tornado = {
        position: new THREE.Vector3(
            (Math.random() - 0.5) * 40,
            0,
            (Math.random() - 0.5) * 40
        ),
        life: 5000,
        born: Date.now()
    };

    const tornadoInterval = setInterval(() => {
        objects.forEach(obj => {
            const dist = obj.position.distanceTo(tornado.position);
            if (dist < 10) {
                const dir = tornado.position.clone().sub(obj.position).normalize();
                if (!obj.userData.velocity) {
                    obj.userData.velocity = new THREE.Vector3();
                }
                obj.userData.velocity.add(dir.multiplyScalar(0.05));
                obj.userData.velocity.y += 0.02;
            }
        });

        if (Date.now() - tornado.born > tornado.life) {
            clearInterval(tornadoInterval);
        }
    }, 16);
}

function spawnMeteor() {
    const meteorGeo = new THREE.SphereGeometry(2, 16, 16);
    const meteorMat = new THREE.MeshStandardMaterial({ 
        color: 0xff4400,
        emissive: 0xff2200,
        emissiveIntensity: 0.5
    });
    const meteor = new THREE.Mesh(meteorGeo, meteorMat);
    meteor.position.set(
        (Math.random() - 0.5) * 60,
        50,
        (Math.random() - 0.5) * 60
    );
    meteor.userData.velocity = new THREE.Vector3(0, -1, 0);
    scene.add(meteor);
    objects.push(meteor);
}

// UI handlers
document.querySelectorAll('.btn[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
        currentMode = btn.dataset.mode;
        document.querySelectorAll('.btn[data-mode]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('mode-indicator').textContent = `BUILD: ${currentMode.toUpperCase()}`;
    });
});

// Chaos wheel handlers
document.getElementById('open-chaos').addEventListener('click', () => {
    document.getElementById('chaos-wheel').classList.add('active');
});

document.getElementById('close-wheel').addEventListener('click', () => {
    document.getElementById('chaos-wheel').classList.remove('active');
});

document.getElementById('spawn-cars').addEventListener('click', () => {
    activateChaos('cars');
});

document.getElementById('npc-panic').addEventListener('click', () => {
    npcMode = npcMode === 'panic' ? 'wander' : 'panic';
    document.getElementById('npc-panic').classList.toggle('active');
});

document.getElementById('npc-dance').addEventListener('click', () => {
    npcMode = npcMode === 'dance' ? 'wander' : 'dance';
    document.getElementById('npc-dance').classList.toggle('active');
    document.getElementById('npc-freeze').classList.remove('active');
});

document.getElementById('npc-freeze').addEventListener('click', () => {
    npcMode = npcMode === 'freeze' ? 'wander' : 'freeze';
    document.getElementById('npc-freeze').classList.toggle('active');
    document.getElementById('npc-dance').classList.remove('active');
});

document.querySelectorAll('.wheel-btn[data-chaos]').forEach(btn => {
    btn.addEventListener('click', () => {
        activateChaos(btn.dataset.chaos);
        document.getElementById('chaos-wheel').classList.remove('active');
    });
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Update NPCs
    npcs.forEach(npc => {
        if (npcMode === 'freeze') {
            return;
        }

        if (npcMode === 'panic') {
            // Run randomly in panic
            if (!npc.userData.target || Math.random() < 0.02) {
                npc.userData.target = new THREE.Vector3(
                    (Math.random() - 0.5) * 80,
                    0,
                    (Math.random() - 0.5) * 80
                );
            }
            const dir = npc.userData.target.clone().sub(npc.position).normalize();
            npc.userData.velocity.x = dir.x * 0.15;
            npc.userData.velocity.z = dir.z * 0.15;
            
            // Shake while running
            npc.rotation.z = Math.sin(Date.now() * 0.02) * 0.2;
        } else if (npcMode === 'dance') {
            // Dance in place
            npc.userData.dancePhase += 0.1;
            npc.position.y = Math.abs(Math.sin(npc.userData.dancePhase)) * 0.3;
            npc.rotation.y += 0.1;
            npc.rotation.z = Math.sin(npc.userData.dancePhase * 2) * 0.3;
            npc.userData.velocity.set(0, 0, 0);
        } else {
            // Wander mode
            if (!npc.userData.target || npc.position.distanceTo(npc.userData.target) < 1 || Math.random() < 0.01) {
                npc.userData.target = new THREE.Vector3(
                    (Math.random() - 0.5) * 60,
                    0,
                    (Math.random() - 0.5) * 60
                );
            }
            const dir = npc.userData.target.clone().sub(npc.position).normalize();
            npc.userData.velocity.x = dir.x * 0.05;
            npc.userData.velocity.z = dir.z * 0.05;
            npc.rotation.z = 0;
        }

        npc.position.x += npc.userData.velocity.x;
        npc.position.z += npc.userData.velocity.z;

        // Look in direction of movement
        if (Math.abs(npc.userData.velocity.x) > 0.01 || Math.abs(npc.userData.velocity.z) > 0.01) {
            npc.rotation.y = Math.atan2(npc.userData.velocity.x, npc.userData.velocity.z);
        }

        // Bounds check
        const dist = Math.sqrt(npc.position.x ** 2 + npc.position.z ** 2);
        if (dist > 45) {
            const angle = Math.atan2(npc.position.z, npc.position.x) + Math.PI;
            npc.userData.target = new THREE.Vector3(
                Math.cos(angle) * 20,
                0,
                Math.sin(angle) * 20
            );
        }
    });

    // Update cars
    cars.forEach(car => {
        if (car.userData.velocity) {
            car.position.add(car.userData.velocity);

            if (gravityEnabled && car.position.y > 0.5) {
                car.userData.velocity.y -= 0.01;
            }

            if (car.position.y < 0.5) {
                car.position.y = 0.5;
                if (bounceMode) {
                    car.userData.velocity.y = Math.abs(car.userData.velocity.y) * 0.8;
                } else {
                    car.userData.velocity.y = 0;
                }
            }

            // Bounds check
            const dist = Math.sqrt(car.position.x ** 2 + car.position.z ** 2);
            if (dist > 45) {
                const angle = Math.atan2(car.position.z, car.position.x) + Math.PI;
                car.userData.velocity.x = Math.cos(angle) * 0.1;
                car.userData.velocity.z = Math.sin(angle) * 0.1;
            }
        }
    });

    // Update all objects with velocity
    objects.forEach(obj => {
        if (obj.userData.velocity) {
            obj.position.add(obj.userData.velocity);

            if (gravityEnabled && obj.position.y > 0) {
                obj.userData.velocity.y -= 0.01;
            }

            if (obj.position.y < 0) {
                obj.position.y = 0;
                if (bounceMode) {
                    obj.userData.velocity.y = Math.abs(obj.userData.velocity.y) * 0.7;
                } else {
                    obj.userData.velocity.multiplyScalar(0.5);
                    if (Math.abs(obj.userData.velocity.y) < 0.01) {
                        obj.userData.velocity.y = 0;
                    }
                }
            }
        }
    });

    // Earthquake shake
    if (shakeIntensity > 0) {
        camera.position.x += (Math.random() - 0.5) * shakeIntensity;
        camera.position.y += (Math.random() - 0.5) * shakeIntensity;
        camera.position.z += (Math.random() - 0.5) * shakeIntensity;
    }

    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();