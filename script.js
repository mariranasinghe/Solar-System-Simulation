// Global variables
let scene, camera, renderer, controls;
let sun, planets = {}, moons = {}, orbits = {};
let viewMode = 'wireframe';
let speed = 1.0;
let gravity = 1.0;
let showOrbits = true;
let showSun = false;
let showPlanets = {
    mercury: false,
    venus: false,
    earth: true,
    mars: false,
    jupiter: false,
    saturn: false,
    uranus: false,
    neptune: false
};

// Planet data
const PLANET_DATA = {
    mercury: { size: 0.4, distance: 8, speed: 4.0, color: 0xB8860B, moons: [] },
    venus: { size: 0.9, distance: 12, speed: 1.6, color: 0xFFA500, moons: [] },
    earth: { size: 1.0, distance: 15, speed: 1.0, color: 0x4169E1, moons: [
        { name: "Moon", size: 0.27, distance: 3, speed: 13.0, color: 0xD3D3D3 }
    ]},
    mars: { size: 0.5, distance: 20, speed: 0.5, color: 0xFF4500, moons: [
        { name: "Phobos", size: 0.1, distance: 1.5, speed: 20.0, color: 0xA0522D },
        { name: "Deimos", size: 0.08, distance: 2.2, speed: 12.0, color: 0xA0522D }
    ]},
    jupiter: { size: 2.5, distance: 30, speed: 0.08, color: 0xDAA520, moons: [
        { name: "Io", size: 0.3, distance: 4, speed: 8.0, color: 0xFFFF00 },
        { name: "Europa", size: 0.25, distance: 5, speed: 6.0, color: 0x87CEEB },
        { name: "Ganymede", size: 0.4, distance: 6.5, speed: 4.5, color: 0xCD853F },
        { name: "Callisto", size: 0.35, distance: 8, speed: 3.0, color: 0xA9A9A9 }
    ]},
    saturn: { size: 2.2, distance: 40, speed: 0.03, color: 0xF4A460, moons: [
        { name: "Titan", size: 0.4, distance: 6, speed: 2.0, color: 0xDEB887 }
    ]},
    uranus: { size: 1.8, distance: 50, speed: 0.01, color: 0x40E0D0, moons: [
        { name: "Miranda", size: 0.15, distance: 3, speed: 8.0, color: 0xD3D3D3 },
        { name: "Ariel", size: 0.2, distance: 4, speed: 6.0, color: 0xD3D3D3 }
    ]},
    neptune: { size: 1.7, distance: 60, speed: 0.006, color: 0x1E90FF, moons: [
        { name: "Triton", size: 0.3, distance: 4.5, speed: 3.0, color: 0xB0E0E6 }
    ]}
};

// Initialize the scene
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    // Create camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 20, 40);

    // Create renderer
    const canvas = document.getElementById('canvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Add stars
    createStars();

    // Create orbital controls (simplified mouse controls)
    setupControls();

    // Create initial objects
    createSun();
    createPlanets();
    createOrbits();

    // Start animation loop
    animate();
}

// Create stars background
function createStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 });

    const starsVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starsVertices.push(x, y, z);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}

// Setup mouse controls
function setupControls() {
    let mouseDown = false;
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;
    let currentRotationX = 0;
    let currentRotationY = 0;

    const canvas = document.getElementById('canvas');

    canvas.addEventListener('mousedown', (event) => {
        mouseDown = true;
        mouseX = event.clientX;
        mouseY = event.clientY;
    });

    canvas.addEventListener('mouseup', () => {
        mouseDown = false;
    });

    canvas.addEventListener('mousemove', (event) => {
        if (mouseDown) {
            const deltaX = event.clientX - mouseX;
            const deltaY = event.clientY - mouseY;
            
            targetRotationY += deltaX * 0.01;
            targetRotationX += deltaY * 0.01;
            
            mouseX = event.clientX;
            mouseY = event.clientY;
        }
    });

    canvas.addEventListener('wheel', (event) => {
        camera.position.z += event.deltaY * 0.01;
        camera.position.z = Math.max(10, Math.min(150, camera.position.z));
    });

    // Update camera rotation
    function updateCamera() {
        currentRotationX += (targetRotationX - currentRotationX) * 0.1;
        currentRotationY += (targetRotationY - currentRotationY) * 0.1;
        
        const radius = camera.position.length();
        camera.position.x = radius * Math.sin(currentRotationY) * Math.cos(currentRotationX);
        camera.position.y = radius * Math.sin(currentRotationX);
        camera.position.z = radius * Math.cos(currentRotationY) * Math.cos(currentRotationX);
        
        camera.lookAt(0, 0, 0);
        
        requestAnimationFrame(updateCamera);
    }
    updateCamera();
}

// Create sun
function createSun() {
    const geometry = new THREE.SphereGeometry(3, 64, 64);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    sun = new THREE.Mesh(geometry, material);
    sun.visible = showSun;
    scene.add(sun);

    // Add sun light
    const sunLight = new THREE.PointLight(0xffff00, 2, 200);
    sun.add(sunLight);
}

// Create planets
function createPlanets() {
    Object.keys(PLANET_DATA).forEach(planetName => {
        const data = PLANET_DATA[planetName];
        
        // Create planet group
        const planetGroup = new THREE.Group();
        const planetOrbitGroup = new THREE.Group();
        
        // Create planet
        const geometry = new THREE.SphereGeometry(data.size, 32, 32);
        const material = viewMode === 'wireframe' 
            ? new THREE.MeshBasicMaterial({ color: data.color, wireframe: true })
            : new THREE.MeshStandardMaterial({ color: data.color, metalness: 0.3, roughness: 0.7 });
        
        const planet = new THREE.Mesh(geometry, material);
        
        // Position planet
        const selectedCount = Object.values(showPlanets).filter(Boolean).length;
        const shouldUseSolarPosition = showSun || selectedCount > 1;
        
        if (shouldUseSolarPosition) {
            planet.position.x = data.distance;
            planetOrbitGroup.add(planet);
            scene.add(planetOrbitGroup);
        } else {
            planet.position.set(0, 0, 0);
            scene.add(planet);
        }
        
        planetGroup.add(planet);
        
        // Create moons
        data.moons.forEach(moonData => {
            const moonGroup = new THREE.Group();
            const moonGeometry = new THREE.SphereGeometry(moonData.size, 16, 16);
            const moonMaterial = viewMode === 'wireframe'
                ? new THREE.MeshBasicMaterial({ color: moonData.color, wireframe: true })
                : new THREE.MeshStandardMaterial({ color: moonData.color, metalness: 0.2, roughness: 0.8 });
            
            const moon = new THREE.Mesh(moonGeometry, moonMaterial);
            const moonOrbitRadius = moonData.distance / Math.sqrt(gravity);
            moon.position.x = moonOrbitRadius;
            
            moonGroup.add(moon);
            planet.add(moonGroup);
            
            if (!moons[planetName]) moons[planetName] = [];
            moons[planetName].push({ group: moonGroup, mesh: moon, data: moonData });
        });
        
        planets[planetName] = {
            group: planetGroup,
            orbitGroup: planetOrbitGroup,
            mesh: planet,
            data: data,
            visible: showPlanets[planetName]
        };
        
        // Set initial visibility
        if (shouldUseSolarPosition) {
            planetOrbitGroup.visible = showPlanets[planetName];
        } else {
            planet.visible = showPlanets[planetName];
        }
    });
}

// Create orbital paths
function createOrbits() {
    Object.keys(PLANET_DATA).forEach(planetName => {
        const data = PLANET_DATA[planetName];
        
        // Planet orbit
        const points = [];
        for (let i = 0; i <= 128; i++) {
            const angle = (i / 128) * Math.PI * 2;
            points.push(new THREE.Vector3(
                Math.cos(angle) * data.distance,
                0,
                Math.sin(angle) * data.distance
            ));
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.3, transparent: true });
        const orbit = new THREE.Line(geometry, material);
        
        orbits[planetName] = orbit;
        scene.add(orbit);
        
        // Moon orbits
        data.moons.forEach((moonData, index) => {
            const moonPoints = [];
            const moonOrbitRadius = moonData.distance / Math.sqrt(gravity);
            
            for (let i = 0; i <= 64; i++) {
                const angle = (i / 64) * Math.PI * 2;
                moonPoints.push(new THREE.Vector3(
                    Math.cos(angle) * moonOrbitRadius,
                    0,
                    Math.sin(angle) * moonOrbitRadius
                ));
            }
            
            const moonGeometry = new THREE.BufferGeometry().setFromPoints(moonPoints);
            const moonMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.4, transparent: true });
            const moonOrbit = new THREE.Line(moonGeometry, moonMaterial);
            
            if (planets[planetName] && planets[planetName].mesh) {
                planets[planetName].mesh.add(moonOrbit);
            }
        });
    });
    
    updateOrbitVisibility();
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const delta = 0.016; // Approximate 60fps
    
    // Rotate sun
    if (sun && sun.visible) {
        sun.rotation.y += delta * 0.05;
    }
    
    // Animate planets
    Object.keys(planets).forEach(planetName => {
        const planet = planets[planetName];
        if (!planet.visible) return;
        
        const data = planet.data;
        const selectedCount = Object.values(showPlanets).filter(Boolean).length;
        const shouldUseSolarPosition = showSun || selectedCount > 1;
        
        // Planet orbital motion
        if (shouldUseSolarPosition && planet.orbitGroup) {
            planet.orbitGroup.rotation.y += delta * data.speed * speed * 0.1;
        }
        
        // Planet rotation
        if (planet.mesh) {
            planet.mesh.rotation.y += delta * 0.5;
        }
        
        // Moon animation
        if (moons[planetName]) {
            moons[planetName].forEach(moon => {
                moon.group.rotation.y += delta * moon.data.speed * speed * 0.1;
                moon.mesh.rotation.y += delta * 0.5;
            });
        }
    });
    
    renderer.render(scene, camera);
}

// Control functions
function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    const content = panel.querySelector('.panel-content');
    const chevron = panel.querySelector('.chevron');
    
    content.classList.toggle('collapsed');
    chevron.classList.toggle('collapsed');
}

function setViewMode(mode) {
    viewMode = mode;
    
    // Update button states
    document.getElementById('wireframeBtn').classList.toggle('active', mode === 'wireframe');
    document.getElementById('solidBtn').classList.toggle('active', mode === 'solid');
    
    // Update materials
    Object.keys(planets).forEach(planetName => {
        const planet = planets[planetName];
        const data = planet.data;
        
        if (planet.mesh) {
            const material = mode === 'wireframe'
                ? new THREE.MeshBasicMaterial({ color: data.color, wireframe: true })
                : new THREE.MeshStandardMaterial({ color: data.color, metalness: 0.3, roughness: 0.7 });
            planet.mesh.material = material;
        }
        
        // Update moon materials
        if (moons[planetName]) {
            moons[planetName].forEach(moon => {
                const moonMaterial = mode === 'wireframe'
                    ? new THREE.MeshBasicMaterial({ color: moon.data.color, wireframe: true })
                    : new THREE.MeshStandardMaterial({ color: moon.data.color, metalness: 0.2, roughness: 0.8 });
                moon.mesh.material = moonMaterial;
            });
        }
    });
}

function updateSpeed(value) {
    speed = parseFloat(value);
    document.getElementById('speedValue').textContent = speed.toFixed(1);
}

function updateGravity(value) {
    gravity = parseFloat(value);
    document.getElementById('gravityValue').textContent = gravity.toFixed(1);
    
    // Update moon orbital radii
    Object.keys(moons).forEach(planetName => {
        if (moons[planetName]) {
            moons[planetName].forEach(moon => {
                const newRadius = moon.data.distance / Math.sqrt(gravity);
                moon.mesh.position.x = newRadius;
            });
        }
    });
}

function toggleOrbits(show) {
    showOrbits = show;
    updateOrbitVisibility();
}

function updateOrbitVisibility() {
    const selectedCount = Object.values(showPlanets).filter(Boolean).length;
    const showPlanetaryOrbits = showSun || selectedCount > 1;
    
    Object.keys(orbits).forEach(planetName => {
        if (orbits[planetName]) {
            orbits[planetName].visible = showOrbits && showPlanetaryOrbits && showPlanets[planetName];
        }
    });
}

function toggleSun(show) {
    showSun = show;
    if (sun) {
        sun.visible = show;
    }
    updatePlanetPositions();
    updateOrbitVisibility();
}

function togglePlanet(planetName, show) {
    showPlanets[planetName] = show;
    
    if (planets[planetName]) {
        const selectedCount = Object.values(showPlanets).filter(Boolean).length;
        const shouldUseSolarPosition = showSun || selectedCount > 1;
        
        if (shouldUseSolarPosition) {
            planets[planetName].orbitGroup.visible = show;
        } else {
            planets[planetName].mesh.visible = show;
        }
        
        planets[planetName].visible = show;
    }
    
    updatePlanetPositions();
    updateOrbitVisibility();
}

function updatePlanetPositions() {
    const selectedCount = Object.values(showPlanets).filter(Boolean).length;
    const shouldUseSolarPosition = showSun || selectedCount > 1;
    
    Object.keys(planets).forEach(planetName => {
        const planet = planets[planetName];
        if (!planet) return;
        
        // Remove from current parent
        if (planet.mesh.parent) {
            planet.mesh.parent.remove(planet.mesh);
        }
        if (planet.orbitGroup.parent) {
            planet.orbitGroup.parent.remove(planet.orbitGroup);
        }
        
        if (shouldUseSolarPosition) {
            planet.mesh.position.x = planet.data.distance;
            planet.orbitGroup.add(planet.mesh);
            scene.add(planet.orbitGroup);
            planet.orbitGroup.visible = planet.visible;
        } else {
            planet.mesh.position.set(0, 0, 0);
            scene.add(planet.mesh);
            planet.mesh.visible = planet.visible;
        }
    });
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize);

// Initialize when page loads
window.addEventListener('load', init);
