// Main game variables
let scene, camera, renderer, composer;
let bus, road, lanes = [];
let traffic = [], pedestrians = [], buildings = [], trees = [];
let roadSegments = [];
let environmentType = 'city';
let weatherType = 'sunny';
let environmentChangeDistance = 1000;
let lastEnvironmentChange = 0;
let clock = new THREE.Clock();
let gameOver = false;
let score = 0;
let distance = 0;
let busSpeed = 0;
let maxSpeed = 120;
let acceleration = 0.6;
let deceleration = 0.9;
let brakePower = 1.8;
let steering = 0;
let steeringSpeed = 0.06;
let maxSteering = 0.6;
let laneWidth = 4;
let currentLane = 2;
let trafficSpeed = 35;
let keyStates = {};
let touchControls = {
    left: false,
    right: false,
    accelerate: false,
    brake: false
};

// Environment progression
let environmentSequence = [
    {type: 'city', duration: 3000, weather: 'sunny', color: 0x87CEEB, fogColor: 0x87CEEB},
    {type: 'suburban', duration: 2000, weather: 'sunny', color: 0x87CEEB, fogColor: 0x87CEEB},
    {type: 'forest', duration: 2500, weather: 'cloudy', color: 0x7EC0EE, fogColor: 0x8FBC8F},
    {type: 'city', duration: 3000, weather: 'sunny', color: 0x87CEEB, fogColor: 0x87CEEB},
    {type: 'desert', duration: 3000, weather: 'sunny', color: 0xF4A460, fogColor: 0xD2B48C},
    {type: 'jungle', duration: 2800, weather: 'rainy', color: 0x4682B4, fogColor: 0x228B22},
    {type: 'rainy', duration: 2000, weather: 'rainy', color: 0x36454F, fogColor: 0x2F4F4F},
    {type: 'city_night', duration: 2500, weather: 'clear_night', color: 0x191970, fogColor: 0x000033}
];

let currentEnvironmentIndex = 0;
let environmentProgress = 0;

// Weather and time variables
let sun, moon;
let rainParticles, snowParticles, sandParticles;
let cloudGroup;
let dayNightCycle = 0;
let rainIntensity = 0;
let windStrength = 0;

// Post-processing effects
let filmPass, rgbShiftPass, fxaaPass;

// Model files configuration
const modelFiles = {
    bus: {
        path: 'models/bus.glb',
        scale: { x: 2.5, y: 2.5, z: 2.5 }
    },
    cars: [
        { path: 'models/car1.glb', scale: { x: 1, y: 1, z: 1 }, name: 'Car 1' },
        { path: 'models/car2.glb', scale: { x: 1, y: 1, z: 1 }, name: 'Car 2' },
        { path: 'models/car3.glb', scale: { x: 1, y: 1, z: 1 }, name: 'Car 3' },
        { path: 'models/car4.glb', scale: { x: 1, y: 1, z: 1 }, name: 'Car 4' },
        { path: 'models/car5.glb', scale: { x: 1, y: 1, z: 1 }, name: 'Car 5' },
        { path: 'models/truck.glb', scale: { x: 2, y: 2, z: 2 }, name: 'Truck' },
        { path: 'models/microbus.glb', scale: { x: 1, y: 1, z: 1 }, name: 'Microbus' }
    ],
    pedestrian: { path: 'models/person.glb', scale: { x: 0.8, y: 0.8, z: 0.8 } },
    buildings: [
        { path: 'models/building1.glb', scale: { x: 3.0, y: 3.0, z: 3.0 } },
        { path: 'models/building2.glb', scale: { x: 3.0, y: 3.0, z: 3.0 } },
        { path: 'models/building3.glb', scale: { x: 3.0, y: 3.0, z: 3.0 } },
        { path: 'models/building4.glb', scale: { x: 3.0, y: 3.0, z: 3.0 } },
        { path: 'models/building5.glb', scale: { x: 3.0, y: 3.0, z: 3.0 } }
    ],
    trees: [
        { path: 'models/tree1.glb', scale: { x: 2.0, y: 2.0, z: 2.0 } },
        { path: 'models/tree2.glb', scale: { x: 2.0, y: 2.0, z: 2.0 } }
    ]
};

let useFallbackModels = false;

// Loading manager
let loadingManager = new THREE.LoadingManager();
let gltfLoader = new THREE.GLTFLoader(loadingManager);
let modelsLoaded = 0;
let totalModelsToLoad = 20;

// Initialize the game
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87CEEB, 100, 800);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3000);
    camera.position.set(0, 15, 25);
    camera.lookAt(0, 0, 0);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('game-canvas'),
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    
    // Setup post-processing
    setupPostProcessing();
    
    // Add lighting
    setupLighting();
    
    // Create sky and atmosphere
    createSky();
    
    // Create road and environment
    createRoad();
    createEnvironment();
    
    // Load bus model
    loadBusModel();
    
    // Load initial traffic and pedestrians
    for (let i = 0; i < 12; i++) {
        setTimeout(() => loadTrafficVehicle(), i * 400);
    }
    
    for (let i = 0; i < 10; i++) {
        setTimeout(() => loadPedestrian(), i * 600);
    }
    
    // Create clouds
    createClouds();
    
    // Create weather effects
    createRainEffect();
    createSnowEffect();
    createSandstormEffect();
    
    // Event listeners
    setupEventListeners();
    
    // Setup loading manager
    setupLoadingManager();
    
    // Start animation loop
    animate();
}

// Setup post-processing effects
function setupPostProcessing() {
    composer = new THREE.EffectComposer(renderer);
    const renderPass = new THREE.RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    // Film grain effect
    filmPass = new THREE.ShaderPass(THREE.FilmShader);
    filmPass.uniforms['grayscale'].value = 0;
    filmPass.uniforms['nIntensity'].value = 0.05;
    filmPass.uniforms['sIntensity'].value = 0.05;
    composer.addPass(filmPass);
    
    // FXAA anti-aliasing
    fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
    fxaaPass.material.uniforms['resolution'].value.set(
        1 / window.innerWidth,
        1 / window.innerHeight
    );
    composer.addPass(fxaaPass);
    
    // RGB shift effect for weather
    rgbShiftPass = new THREE.ShaderPass(THREE.RGBShiftShader);
    rgbShiftPass.uniforms['amount'].value = 0.0005;
    composer.addPass(rgbShiftPass);
}

// Setup lighting system
function setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    // Main directional light (sun)
    sun = new THREE.DirectionalLight(0xFFD700, 1.0);
    sun.position.set(100, 200, 100);
    sun.castShadow = true;
    sun.shadow.camera.left = -150;
    sun.shadow.camera.right = 150;
    sun.shadow.camera.top = 150;
    sun.shadow.camera.bottom = -150;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.bias = -0.0001;
    scene.add(sun);
    
    // Moon light for night
    moon = new THREE.DirectionalLight(0x87CEEB, 0);
    moon.position.set(-100, 200, -100);
    scene.add(moon);
    
    // Hemisphere light for sky color
    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x8B7355, 0.3);
    scene.add(hemiLight);
}

// Create sky
function createSky() {
    // Sky gradient
    const vertexShader = `
        varying vec3 vWorldPosition;
        void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    
    const fragmentShader = `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        
        void main() {
            float h = normalize(vWorldPosition + offset).y;
            gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
    `;
    
    const skyGeo = new THREE.SphereGeometry(2000, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: {
            topColor: { value: new THREE.Color(0x87CEEB) },
            bottomColor: { value: new THREE.Color(0xFFFFFF) },
            offset: { value: 400 },
            exponent: { value: 0.6 }
        },
        side: THREE.BackSide
    });
    
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);
}

// Create the road
function createRoad() {
    // Road surface
    const roadGeometry = new THREE.PlaneGeometry(100, 10000);
    const roadMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        roughness: 0.8,
        metalness: 0.2
    });
    road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.y = -0.1;
    road.receiveShadow = true;
    scene.add(road);
    
    // Road markings
    for (let i = -5000; i < 5000; i += 20) {
        // Center line
        const lineGeometry = new THREE.PlaneGeometry(0.2, 4);
        const lineMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.rotation.x = -Math.PI / 2;
        line.position.set(0, 0.01, i);
        scene.add(line);
        
        // Lane markings
        for (let lane = 1; lane <= 3; lane++) {
            const laneLineGeometry = new THREE.PlaneGeometry(0.1, 2);
            const laneLineMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
            const laneLine = new THREE.Mesh(laneLineGeometry, laneLineMaterial);
            laneLine.rotation.x = -Math.PI / 2;
            laneLine.position.set(lane * laneWidth, 0.01, i + 10);
            scene.add(laneLine);
            
            const laneLine2 = new THREE.Mesh(laneLineGeometry, laneLineMaterial);
            laneLine2.rotation.x = -Math.PI / 2;
            laneLine2.position.set(-lane * laneWidth, 0.01, i + 10);
            scene.add(laneLine2);
        }
    }
    
    // Sidewalks
    const sidewalkGeometry = new THREE.PlaneGeometry(6, 10000);
    const sidewalkMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x666666,
        roughness: 0.9
    });
    
    const leftSidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
    leftSidewalk.rotation.x = -Math.PI / 2;
    leftSidewalk.position.set(-laneWidth * 2.5 - 3, 0.02, 0);
    leftSidewalk.receiveShadow = true;
    scene.add(leftSidewalk);
    
    const rightSidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
    rightSidewalk.rotation.x = -Math.PI / 2;
    rightSidewalk.position.set(laneWidth * 2.5 + 3, 0.02, 0);
    rightSidewalk.receiveShadow = true;
    scene.add(rightSidewalk);
    
    // Create lanes array for positioning
    for (let i = 0; i < 4; i++) {
        lanes.push(-laneWidth * 1.5 + i * laneWidth);
    }
}

// Create initial environment
function createEnvironment() {
    // Add initial city buildings
    for (let i = -200; i < 200; i += 50) {
        if (Math.abs(i) > 100) {
            createSceneryItem(i * 3, i);
        }
    }
}

// Create scenery items based on environment type
function createSceneryItem(x, z) {
    const env = environmentSequence[currentEnvironmentIndex];
    let item;
    
    if (env.type.includes('city') || env.type === 'suburban') {
        // Create buildings
        const buildingHeight = env.type === 'city' ? Math.random() * 40 + 30 : Math.random() * 25 + 15;
        const buildingWidth = Math.random() * 20 + 10;
        const buildingDepth = Math.random() * 20 + 10;
        
        const buildingGeometry = new THREE.BoxGeometry(buildingWidth, buildingHeight, buildingDepth);
        const buildingMaterial = new THREE.MeshStandardMaterial({ 
            color: env.type === 'city_night' ? 0x222222 : Math.random() * 0x333333 + 0x222222,
            roughness: 0.7
        });
        
        item = new THREE.Mesh(buildingGeometry, buildingMaterial);
        item.position.set(x, buildingHeight / 2, z);
        item.castShadow = true;
        item.receiveShadow = true;
        
        // Add windows with lights at night
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                if (Math.random() > 0.4) {
                    const windowGeometry = new THREE.PlaneGeometry(1, 1.5);
                    const windowColor = env.type === 'city_night' ? 
                        (Math.random() > 0.7 ? 0xFFD700 : 0x87CEEB) : 0x87CEEB;
                    
                    const windowMaterial = new THREE.MeshStandardMaterial({ 
                        color: windowColor,
                        emissive: env.type === 'city_night' ? windowColor : 0x222222,
                        emissiveIntensity: env.type === 'city_night' ? 0.8 : 0.3
                    });
                    
                    const window = new THREE.Mesh(windowGeometry, windowMaterial);
                    window.position.set(
                        -buildingWidth/2 + 0.1,
                        -buildingHeight/2 + 5 + i * 5,
                        -buildingDepth/2 + 1 + j * 2.5
                    );
                    window.rotation.y = Math.PI / 2;
                    item.add(window);
                }
            }
        }
        
        buildings.push(item);
    } 
    else if (env.type === 'forest' || env.type === 'jungle') {
        // Create trees
        const treeCount = env.type === 'jungle' ? 3 : 1;
        
        for (let t = 0; t < treeCount; t++) {
            const treeGroup = new THREE.Group();
            const offsetX = (t - 1) * 5;
            
            const trunkHeight = env.type === 'jungle' ? 10 + Math.random() * 8 : 8 + Math.random() * 6;
            const trunkRadius = env.type === 'jungle' ? 0.8 : 0.5;
            const treeTrunkGeometry = new THREE.CylinderGeometry(trunkRadius * 0.7, trunkRadius, trunkHeight, 8);
            const treeTrunkMaterial = new THREE.MeshStandardMaterial({ 
                color: env.type === 'jungle' ? 0x654321 : 0x8B4513 
            });
            const treeTrunk = new THREE.Mesh(treeTrunkGeometry, treeTrunkMaterial);
            treeTrunk.position.y = trunkHeight / 2;
            treeTrunk.castShadow = true;
            treeTrunk.receiveShadow = true;
            treeGroup.add(treeTrunk);
            
            const leafColor = env.type === 'jungle' ? 0x228B22 : 0x32CD32;
            const leafSize = env.type === 'jungle' ? 8 : 6;
            
            for (let l = 0; l < 3; l++) {
                const treeTopGeometry = new THREE.ConeGeometry(leafSize - l * 2, trunkHeight / 2, 8);
                const treeTopMaterial = new THREE.MeshStandardMaterial({ 
                    color: leafColor,
                    roughness: 0.9
                });
                const treeTop = new THREE.Mesh(treeTopGeometry, treeTopMaterial);
                treeTop.position.y = trunkHeight + l * (trunkHeight / 3);
                treeTop.castShadow = true;
                treeGroup.add(treeTop);
            }
            
            treeGroup.position.set(x + offsetX, 0, z + Math.random() * 10);
            treeGroup.castShadow = true;
            treeGroup.receiveShadow = true;
            
            if (item) {
                const group = new THREE.Group();
                group.add(item);
                group.add(treeGroup);
                item = group;
            } else {
                item = treeGroup;
            }
        }
        
        trees.push(item);
    }
    else if (env.type === 'desert') {
        // Create desert rocks and cacti
        if (Math.random() > 0.7) {
            // Create cactus
            const cactusGroup = new THREE.Group();
            
            const cactusHeight = 4 + Math.random() * 6;
            const cactusGeometry = new THREE.CylinderGeometry(0.3, 0.4, cactusHeight, 6);
            const cactusMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
            const cactus = new THREE.Mesh(cactusGeometry, cactusMaterial);
            cactus.position.y = cactusHeight / 2;
            cactusGroup.add(cactus);
            
            // Add arms to cactus
            if (Math.random() > 0.5) {
                const armGeometry = new THREE.CylinderGeometry(0.2, 0.25, 2, 6);
                const arm = new THREE.Mesh(armGeometry, cactusMaterial);
                arm.position.set(1, cactusHeight * 0.7, 0);
                arm.rotation.z = Math.PI / 4;
                cactusGroup.add(arm);
            }
            
            cactusGroup.position.set(x, 0, z);
            cactusGroup.castShadow = true;
            item = cactusGroup;
        } else {
            // Create desert rock
            const rockSize = 2 + Math.random() * 4;
            const rockGeometry = new THREE.DodecahedronGeometry(rockSize, 0);
            const rockMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xA0522D,
                roughness: 0.9
            });
            item = new THREE.Mesh(rockGeometry, rockMaterial);
            item.position.set(x, rockSize / 2, z);
            item.castShadow = true;
            item.receiveShadow = true;
        }
    }
    else {
        // Generic scenery for other environments
        const scenerySize = 10 + Math.random() * 20;
        const sceneryGeometry = new THREE.BoxGeometry(scenerySize, scenerySize * 0.5, scenerySize);
        const sceneryMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x888888,
            roughness: 0.8
        });
        item = new THREE.Mesh(sceneryGeometry, sceneryMaterial);
        item.position.set(x, scenerySize * 0.25, z);
        item.castShadow = true;
        item.receiveShadow = true;
    }
    
    if (item) {
        scene.add(item);
        roadSegments.push({ object: item, z: z });
    }
}

// Create clouds
function createClouds() {
    cloudGroup = new THREE.Group();
    
    for (let i = 0; i < 50; i++) {
        const cloud = createSingleCloud();
        cloud.position.set(
            Math.random() * 800 - 400,
            100 + Math.random() * 100,
            Math.random() * 1000 - 500
        );
        cloudGroup.add(cloud);
    }
    
    scene.add(cloudGroup);
}

// Create a single cloud
function createSingleCloud() {
    const cloud = new THREE.Group();
    const cloudPieces = 3 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < cloudPieces; i++) {
        const size = 5 + Math.random() * 8;
        const pieceGeometry = new THREE.SphereGeometry(size, 8, 8);
        const pieceMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.8,
            roughness: 1.0
        });
        const piece = new THREE.Mesh(pieceGeometry, pieceMaterial);
        piece.position.set(
            (Math.random() - 0.5) * 15,
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 15
        );
        cloud.add(piece);
    }
    
    return cloud;
}

// Create rain effect
function createRainEffect() {
    const rainCount = 5000;
    const rainGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);
    
    for (let i = 0; i < rainCount * 3; i += 3) {
        positions[i] = Math.random() * 400 - 200;
        positions[i + 1] = Math.random() * 200 + 50;
        positions[i + 2] = Math.random() * 400 - 200;
    }
    
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const rainMaterial = new THREE.PointsMaterial({
        color: 0xAAAAFF,
        size: 0.1,
        transparent: true
    });
    
    rainParticles = new THREE.Points(rainGeometry, rainMaterial);
    rainParticles.visible = false;
    scene.add(rainParticles);
}

// Create snow effect
function createSnowEffect() {
    const snowCount = 2000;
    const snowGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(snowCount * 3);
    
    for (let i = 0; i < snowCount * 3; i += 3) {
        positions[i] = Math.random() * 400 - 200;
        positions[i + 1] = Math.random() * 100 + 50;
        positions[i + 2] = Math.random() * 400 - 200;
    }
    
    snowGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const snowMaterial = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 0.2,
        transparent: true
    });
    
    snowParticles = new THREE.Points(snowGeometry, snowMaterial);
    snowParticles.visible = false;
    scene.add(snowParticles);
}

// Create sandstorm effect
function createSandstormEffect() {
    const sandCount = 3000;
    const sandGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(sandCount * 3);
    
    for (let i = 0; i < sandCount * 3; i += 3) {
        positions[i] = Math.random() * 400 - 200;
        positions[i + 1] = Math.random() * 50 + 10;
        positions[i + 2] = Math.random() * 400 - 200;
    }
    
    sandGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const sandMaterial = new THREE.PointsMaterial({
        color: 0xD2B48C,
        size: 0.15,
        transparent: true
    });
    
    sandParticles = new THREE.Points(sandGeometry, sandMaterial);
    sandParticles.visible = false;
    scene.add(sandParticles);
}

// Load bus model - FIXED ROTATION ISSUE
function loadBusModel() {
    if (useFallbackModels) {
        createFallbackBus();
    } else {
        gltfLoader.load(modelFiles.bus.path, (gltf) => {
            bus = gltf.scene;
            
            // Apply scale
            bus.scale.set(
                modelFiles.bus.scale.x,
                modelFiles.bus.scale.y,
                modelFiles.bus.scale.z
            );
            
            // Fix: Reset all rotations to 0
            bus.rotation.set(0, 0, 0);
            
            // Adjust position
            bus.position.set(0, 2, 0);
            
            // Enable shadows
            bus.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            scene.add(bus);
            updateLoadingProgress();
            console.log('Bus model loaded successfully');
            
        }, undefined, (error) => {
            console.error('Error loading bus model:', error);
            createFallbackBus();
        });
    }
}

// Create a fallback bus model
function createFallbackBus() {
    const busGroup = new THREE.Group();
    
    // Bus body
    const busBodyGeometry = new THREE.BoxGeometry(8, 4, 14);
    const busBodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x3498db,
        roughness: 0.5,
        metalness: 0.2
    });
    const busBody = new THREE.Mesh(busBodyGeometry, busBodyMaterial);
    busBody.position.y = 2;
    busBody.castShadow = true;
    busBody.receiveShadow = true;
    busGroup.add(busBody);
    
    // Bus windows
    const windowGeometry = new THREE.BoxGeometry(7, 1.5, 12);
    const windowMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x87CEEB,
        transparent: true,
        opacity: 0.7
    });
    const windows = new THREE.Mesh(windowGeometry, windowMaterial);
    windows.position.set(0, 3.5, 0);
    windows.castShadow = true;
    busGroup.add(windows);
    
    // Bus wheels
    const wheelGeometry = new THREE.CylinderGeometry(1.0, 1.0, 0.6, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
    
    const positions = [
        [-2.5, 0.6, 5],
        [2.5, 0.6, 5],
        [-2.5, 0.6, -5],
        [2.5, 0.6, -5]
    ];
    
    positions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.position.set(pos[0], pos[1], pos[2]);
        wheel.rotation.z = Math.PI / 2;
        wheel.castShadow = true;
        busGroup.add(wheel);
    });
    
    bus = busGroup;
    bus.position.set(0, 2, 0);
    bus.rotation.set(0, 0, 0); // Fix: No rotation
    scene.add(bus);
    
    updateLoadingProgress();
}

// Load traffic vehicles - FIXED ROTATION ISSUE
function loadTrafficVehicle() {
    if (traffic.length >= 15) return;
    
    const lane = Math.floor(Math.random() * 4);
    const z = -150 - Math.random() * 300;
    
    if (useFallbackModels) {
        createFallbackCar(lane, z);
    } else {
        const randomCarIndex = Math.floor(Math.random() * modelFiles.cars.length);
        const carModel = modelFiles.cars[randomCarIndex];
        
        gltfLoader.load(carModel.path, (gltf) => {
            const vehicle = gltf.scene;
            
            // Apply scale
            vehicle.scale.set(
                carModel.scale.x,
                carModel.scale.y,
                carModel.scale.z
            );
            
            // Fix: Reset rotation
            vehicle.rotation.set(0, 0, 0);
            
            vehicle.position.set(lanes[lane], 1, z);
            
            // Enable shadows
            vehicle.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            scene.add(vehicle);
            traffic.push({
                object: vehicle,
                lane: lane,
                speed: trafficSpeed + Math.random() * 20 - 10,
                modelType: carModel.name
            });
            updateLoadingProgress();
            
        }, undefined, (error) => {
            console.error('Error loading traffic vehicle:', error);
            createFallbackCar(lane, z);
        });
    }
}

// Create a fallback car model
function createFallbackCar(lane, z) {
    const carGroup = new THREE.Group();
    const carColors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF];
    const carColor = carColors[Math.floor(Math.random() * carColors.length)];
    
    // Car body
    const carBodyGeometry = new THREE.BoxGeometry(3.5, 1.8, 6);
    const carBodyMaterial = new THREE.MeshStandardMaterial({ 
        color: carColor,
        roughness: 0.5,
        metalness: 0.3
    });
    const carBody = new THREE.Mesh(carBodyGeometry, carBodyMaterial);
    carBody.position.y = 0.9;
    carBody.castShadow = true;
    carBody.receiveShadow = true;
    carGroup.add(carBody);
    
    // Car top
    const carTopGeometry = new THREE.BoxGeometry(3, 1.2, 3.5);
    const carTopMaterial = new THREE.MeshStandardMaterial({ 
        color: carColor,
        roughness: 0.5,
        metalness: 0.3
    });
    const carTop = new THREE.Mesh(carTopGeometry, carTopMaterial);
    carTop.position.y = 2.0;
    carTop.position.z = -0.5;
    carTop.castShadow = true;
    carGroup.add(carTop);
    
    // Car windows
    const windowGeometry = new THREE.BoxGeometry(2.5, 0.7, 2.5);
    const windowMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x87CEEB,
        transparent: true,
        opacity: 0.7
    });
    const windows = new THREE.Mesh(windowGeometry, windowMaterial);
    windows.position.set(0, 2.0, 0.5);
    windows.castShadow = true;
    carGroup.add(windows);
    
    // Car wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 12);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
    
    const positions = [
        [-1.2, 0.5, 2],
        [1.2, 0.5, 2],
        [-1.2, 0.5, -2],
        [1.2, 0.5, -2]
    ];
    
    positions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.position.set(pos[0], pos[1], pos[2]);
        wheel.rotation.z = Math.PI / 2;
        wheel.castShadow = true;
        carGroup.add(wheel);
    });
    
    carGroup.position.set(lanes[lane], 1, z);
    carGroup.rotation.set(0, 0, 0); // Fix: No rotation
    scene.add(carGroup);
    
    traffic.push({
        object: carGroup,
        lane: lane,
        speed: trafficSpeed + Math.random() * 20 - 10,
        modelType: 'Car'
    });
    
    updateLoadingProgress();
}

// Load pedestrian model
function loadPedestrian() {
    if (pedestrians.length >= 12) return;
    
    const side = Math.random() > 0.5 ? 1 : -1;
    const x = (laneWidth * 2.5 + 3) * side;
    const z = -80 - Math.random() * 400;
    
    if (useFallbackModels) {
        createFallbackPedestrian(x, z, side);
    } else {
        gltfLoader.load(modelFiles.pedestrian.path, (gltf) => {
            const pedestrian = gltf.scene;
            pedestrian.scale.set(0.8, 0.8, 0.8);
            pedestrian.position.set(x, 0, z);
            pedestrian.rotation.set(0, 0, 0);
            
            // Enable shadows
            pedestrian.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            scene.add(pedestrian);
            pedestrians.push({
                object: pedestrian,
                side: side,
                speed: 2 + Math.random() * 3
            });
            updateLoadingProgress();
            
        }, undefined, (error) => {
            console.error('Error loading pedestrian model:', error);
            createFallbackPedestrian(x, z, side);
        });
    }
}

// Create a fallback pedestrian model
function createFallbackPedestrian(x, z, side) {
    const pedestrianGroup = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.BoxGeometry(0.8, 2, 0.5);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513,
        roughness: 0.8
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    body.castShadow = true;
    body.receiveShadow = true;
    pedestrianGroup.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.4, 8, 8);
    const headMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFCC99,
        roughness: 0.9
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2.2;
    head.castShadow = true;
    pedestrianGroup.add(head);
    
    pedestrianGroup.position.set(x, 0, z);
    pedestrianGroup.rotation.set(0, 0, 0);
    scene.add(pedestrianGroup);
    
    pedestrians.push({
        object: pedestrianGroup,
        side: side,
        speed: 2 + Math.random() * 3
    });
    
    updateLoadingProgress();
}

// Setup loading manager
function setupLoadingManager() {
    loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
        const progress = (itemsLoaded / itemsTotal) * 100;
        document.getElementById('loading-progress').style.width = `${progress}%`;
        document.getElementById('loading-text').textContent = `Loading assets... ${Math.round(progress)}%`;
    };
    
    loadingManager.onLoad = () => {
        setTimeout(() => {
            document.getElementById('loading-screen').style.display = 'none';
        }, 1000);
    };
}

// Update loading progress
function updateLoadingProgress() {
    modelsLoaded++;
    const progress = (modelsLoaded / totalModelsToLoad) * 100;
    document.getElementById('loading-progress').style.width = `${Math.min(progress, 100)}%`;
    document.getElementById('loading-text').textContent = `Loading models... ${Math.min(Math.round(progress), 100)}%`;
    
    if (modelsLoaded >= totalModelsToLoad) {
        setTimeout(() => {
            document.getElementById('loading-screen').style.display = 'none';
        }, 1000);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Keyboard controls
    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        keyStates[key] = true;
        
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
            e.preventDefault();
        }
        
        // Toggle fullscreen with F key
        if (key === 'f') {
            toggleFullscreen();
        }
    });
    
    window.addEventListener('keyup', (e) => {
        keyStates[e.key.toLowerCase()] = false;
    });
    
    // Touch controls
    const leftBtn = document.getElementById('left-btn');
    const rightBtn = document.getElementById('right-btn');
    const accelerateBtn = document.getElementById('accelerate-btn');
    const brakeBtn = document.getElementById('brake-btn');
    
    // Add touch and mouse events for all buttons
    [leftBtn, rightBtn, accelerateBtn, brakeBtn].forEach(btn => {
        const btnId = btn.id;
        
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            touchControls[btnId.replace('-btn', '')] = true;
            btn.classList.add('active');
        });
        
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            touchControls[btnId.replace('-btn', '')] = false;
            btn.classList.remove('active');
        });
        
        btn.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            touchControls[btnId.replace('-btn', '')] = false;
            btn.classList.remove('active');
        });
        
        btn.addEventListener('mousedown', () => {
            touchControls[btnId.replace('-btn', '')] = true;
            btn.classList.add('active');
        });
        
        btn.addEventListener('mouseup', () => {
            touchControls[btnId.replace('-btn', '')] = false;
            btn.classList.remove('active');
        });
        
        btn.addEventListener('mouseleave', () => {
            touchControls[btnId.replace('-btn', '')] = false;
            btn.classList.remove('active');
        });
    });
    
    // Restart button
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    
    // Window resize
    window.addEventListener('resize', onWindowResize);
    
    // Fullscreen change
    document.addEventListener('fullscreenchange', updateFullscreenButton);
    document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
    document.addEventListener('mozfullscreenchange', updateFullscreenButton);
    
    // Prevent context menu on long press
    document.addEventListener('contextmenu', (e) => e.preventDefault());
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    
    if (fxaaPass) {
        fxaaPass.material.uniforms['resolution'].value.set(
            1 / window.innerWidth,
            1 / window.innerHeight
        );
    }
}

// Update controls
function updateControls() {
    // Keyboard controls
    if (keyStates['arrowleft'] || keyStates['a']) {
        steering = Math.max(steering - steeringSpeed, -maxSteering);
    } else if (keyStates['arrowright'] || keyStates['d']) {
        steering = Math.min(steering + steeringSpeed, maxSteering);
    } else {
        // Return steering to center
        if (steering > 0) steering = Math.max(steering - steeringSpeed/2, 0);
        if (steering < 0) steering = Math.min(steering + steeringSpeed/2, 0);
    }
    
    // Touch controls
    if (touchControls.left) {
        steering = Math.max(steering - steeringSpeed, -maxSteering);
    }
    if (touchControls.right) {
        steering = Math.min(steering + steeringSpeed, maxSteering);
    }
    
    // Acceleration
    if (keyStates['arrowup'] || keyStates['w'] || touchControls.accelerate) {
        busSpeed = Math.min(busSpeed + acceleration, maxSpeed);
    } else {
        // Natural deceleration
        busSpeed = Math.max(busSpeed - deceleration, 0);
    }
    
    // Braking
    if (keyStates['arrowdown'] || keyStates['s'] || touchControls.brake) {
        busSpeed = Math.max(busSpeed - brakePower, -maxSpeed/3);
    }
}

// Update bus position - FIXED TILT ISSUE
function updateBus(deltaTime) {
    if (!bus || gameOver) return;
    
    // Move bus forward
    const forwardSpeed = busSpeed * deltaTime * 12;
    bus.position.z -= forwardSpeed;
    
    // Update steering
    const targetX = lanes[currentLane] + steering * 12;
    bus.position.x += (targetX - bus.position.x) * 0.1;
    
    // REMOVED tilt effect: bus.rotation.z = -steering * 0.1;
    // Keep bus straight
    bus.rotation.z = 0;
    
    // Update camera
    camera.position.x = bus.position.x * 0.5;
    camera.position.z = bus.position.z + 25;
    camera.position.y = 15 + Math.sin(Date.now() * 0.001) * 0.5; // Slight bobbing
    
    // Update distance and score
    distance += Math.abs(forwardSpeed);
    score = Math.floor(distance / 10);
    
    // Update environment progress
    environmentProgress += Math.abs(forwardSpeed);
    
    // Update UI
    document.getElementById('speed').textContent = Math.abs(Math.round(busSpeed));
    document.getElementById('distance').textContent = Math.round(distance);
    document.getElementById('score').textContent = score;
}

// Update traffic
function updateTraffic(deltaTime) {
    for (let i = traffic.length - 1; i >= 0; i--) {
        const vehicle = traffic[i];
        
        // Move vehicle
        vehicle.object.position.z -= vehicle.speed * deltaTime * 12;
        
        // Remove if too far behind
        if (vehicle.object.position.z > bus.position.z + 150) {
            scene.remove(vehicle.object);
            traffic.splice(i, 1);
            setTimeout(() => loadTrafficVehicle(), 100);
        }
        
        // Check collision
        if (checkCollision(bus, vehicle.object)) {
            gameOver = true;
            document.getElementById('crash-message').textContent = `You crashed into a ${vehicle.modelType}!`;
            document.getElementById('final-score').textContent = score;
            document.getElementById('game-over').style.display = 'flex';
        }
    }
}

// Update pedestrians
function updatePedestrians(deltaTime) {
    for (let i = pedestrians.length - 1; i >= 0; i--) {
        const pedestrian = pedestrians[i];
        
        // Move pedestrian
        pedestrian.object.position.z -= pedestrian.speed * deltaTime * 12;
        
        // Remove if too far behind
        if (pedestrian.object.position.z > bus.position.z + 150) {
            scene.remove(pedestrian.object);
            pedestrians.splice(i, 1);
            setTimeout(() => loadPedestrian(), 100);
        }
    }
}

// Update environment and weather
function updateEnvironment(deltaTime) {
    const env = environmentSequence[currentEnvironmentIndex];
    
    // Check for environment change
    if (environmentProgress >= env.duration) {
        environmentProgress = 0;
        currentEnvironmentIndex = (currentEnvironmentIndex + 1) % environmentSequence.length;
        
        // Clear old scenery
        for (const segment of roadSegments) {
            scene.remove(segment.object);
        }
        roadSegments = [];
        
        // Update UI
        document.getElementById('area').textContent = env.type.charAt(0).toUpperCase() + env.type.slice(1);
        document.getElementById('weather').textContent = env.weather.charAt(0).toUpperCase() + env.weather.slice(1);
    }
    
    // Update current environment
    const currentEnv = environmentSequence[currentEnvironmentIndex];
    
    // Update sky and fog
    scene.fog.color.set(currentEnv.fogColor);
    scene.fog.near = 50;
    scene.fog.far = currentEnv.type === 'city_night' ? 500 : 800;
    
    // Update lighting based on environment
    updateLighting(currentEnv);
    
    // Update weather effects
    updateWeatherEffects(currentEnv);
    
    // Create new scenery ahead
    if (roadSegments.length < 20) {
        createSceneryItem(
            (Math.random() > 0.5 ? 1 : -1) * (40 + Math.random() * 80),
            bus.position.z - 300 - Math.random() * 200
        );
    }
    
    // Remove old scenery behind
    for (let i = roadSegments.length - 1; i >= 0; i--) {
        if (roadSegments[i].z > bus.position.z + 300) {
            scene.remove(roadSegments[i].object);
            roadSegments.splice(i, 1);
        }
    }
    
    // Update clouds
    updateClouds(deltaTime);
}

// Update lighting based on environment
function updateLighting(env) {
    // Day/night cycle
    dayNightCycle += 0.0005;
    
    if (env.type === 'city_night' || env.weather === 'clear_night') {
        // Night time
        sun.intensity = 0.1;
        moon.intensity = 0.3;
        renderer.toneMappingExposure = 0.7;
    } else if (env.type === 'rainy' || env.weather === 'rainy') {
        // Rainy/cloudy
        sun.intensity = 0.3;
        moon.intensity = 0;
        renderer.toneMappingExposure = 0.8;
    } else if (env.type === 'desert') {
        // Bright desert
        sun.intensity = 1.5;
        moon.intensity = 0;
        renderer.toneMappingExposure = 1.2;
    } else {
        // Normal day
        sun.intensity = 1.0;
        moon.intensity = 0;
        renderer.toneMappingExposure = 1.0;
    }
    
    // Update sun position
    sun.position.x = Math.cos(dayNightCycle) * 200;
    sun.position.y = Math.sin(dayNightCycle) * 100 + 150;
    sun.position.z = Math.sin(dayNightCycle) * 200;
}

// Update weather effects
function updateWeatherEffects(env) {
    // Rain
    if (env.weather === 'rainy' || env.type === 'jungle' || env.type === 'rainy') {
        rainIntensity = Math.min(rainIntensity + 0.01, 1);
        rainParticles.visible = true;
        
        // Update rain particles
        const positions = rainParticles.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] -= 2 * rainIntensity;
            if (positions[i + 1] < 0) {
                positions[i + 1] = 200;
                positions[i] = Math.random() * 400 - 200;
                positions[i + 2] = Math.random() * 400 - 200;
            }
        }
        rainParticles.geometry.attributes.position.needsUpdate = true;
        
        // Add post-processing effects for rain
        filmPass.uniforms['sIntensity'].value = 0.1 * rainIntensity;
        rgbShiftPass.uniforms['amount'].value = 0.001 * rainIntensity;
    } else {
        rainIntensity = Math.max(rainIntensity - 0.01, 0);
        if (rainIntensity <= 0) {
            rainParticles.visible = false;
        }
        filmPass.uniforms['sIntensity'].value = 0.05;
        rgbShiftPass.uniforms['amount'].value = 0.0005;
    }
    
    // Sandstorm for desert
    if (env.type === 'desert') {
        sandParticles.visible = true;
        const positions = sandParticles.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += 0.5;
            positions[i + 1] += Math.sin(Date.now() * 0.001 + i) * 0.1;
            if (positions[i] > 200) {
                positions[i] = -200;
                positions[i + 1] = Math.random() * 50 + 10;
                positions[i + 2] = Math.random() * 400 - 200;
            }
        }
        sandParticles.geometry.attributes.position.needsUpdate = true;
    } else {
        sandParticles.visible = false;
    }
}

// Update clouds
function updateClouds(deltaTime) {
    const env = environmentSequence[currentEnvironmentIndex];
    
    cloudGroup.children.forEach(cloud => {
        // Move clouds
        cloud.position.x += 0.1 * deltaTime * 60;
        cloud.position.z += 0.05 * deltaTime * 60;
        
        // Wrap around
        if (cloud.position.x > 400) cloud.position.x = -400;
        if (cloud.position.z > 500) cloud.position.z = -500;
        
        // Adjust opacity based on weather
        cloud.children.forEach(piece => {
            if (env.weather === 'rainy' || env.weather === 'cloudy') {
                piece.material.opacity = 0.9;
            } else if (env.type === 'desert') {
                piece.material.opacity = 0.3;
            } else {
                piece.material.opacity = 0.8;
            }
        });
    });
}

// Check collision
function checkCollision(obj1, obj2) {
    if (!obj1 || !obj2) return false;
    
    const box1 = new THREE.Box3().setFromObject(obj1);
    const box2 = new THREE.Box3().setFromObject(obj2);
    
    return box1.intersectsBox(box2);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = Math.min(clock.getDelta(), 0.1);
    
    if (!gameOver) {
        updateControls();
        updateBus(deltaTime);
        updateTraffic(deltaTime);
        updatePedestrians(deltaTime);
        updateEnvironment(deltaTime);
    }
    
    composer.render();
}

// Restart game
function restartGame() {
    gameOver = false;
    score = 0;
    distance = 0;
    busSpeed = 0;
    steering = 0;
    currentLane = 2;
    environmentProgress = 0;
    currentEnvironmentIndex = 0;
    
    // Reset bus
    if (bus) {
        bus.position.set(0, 2, 0);
        bus.rotation.set(0, 0, 0);
    }
    
    // Clear traffic
    traffic.forEach(vehicle => scene.remove(vehicle.object));
    traffic = [];
    
    // Clear pedestrians
    pedestrians.forEach(pedestrian => scene.remove(pedestrian.object));
    pedestrians = [];
    
    // Clear scenery
    roadSegments.forEach(segment => scene.remove(segment.object));
    roadSegments = [];
    
    // Clear buildings and trees
    buildings.forEach(building => scene.remove(building));
    buildings = [];
    trees.forEach(tree => scene.remove(tree));
    trees = [];
    
    // Hide game over screen
    document.getElementById('game-over').style.display = 'none';
    
    // Recreate environment
    createEnvironment();
    
    // Reload models
    for (let i = 0; i < 12; i++) {
        setTimeout(() => loadTrafficVehicle(), i * 400);
    }
    
    for (let i = 0; i < 10; i++) {
        setTimeout(() => loadPedestrian(), i * 600);
    }
    
    // Reset UI
    document.getElementById('area').textContent = 'City';
    document.getElementById('weather').textContent = 'Sunny';
}

// Fullscreen functions
function toggleFullscreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement) {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        }
    }
}

function updateFullscreenButton() {
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement;
    
    if (isFullscreen) {
        fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
    } else {
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
    }
}

// Initialize the game
window.addEventListener('load', init);

// Handle orientation change
window.addEventListener('orientationchange', () => {
    setTimeout(onWindowResize, 100);
});

// Prevent zoom on mobile
document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

// Handle visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Game paused
        clock.stop();
    } else {
        // Game resumed
        clock.start();
    }
});