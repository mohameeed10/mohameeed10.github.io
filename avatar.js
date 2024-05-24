import * as THREE from 'three';
import { GLTFLoader } from 'https://unpkg.com/three@0.158.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://unpkg.com/three@0.158.0/examples/jsm/controls/OrbitControls.js';

window.onload = () => loadModel();

function loadModel() {
    const loader = new GLTFLoader();
    loader.load(
        'myanimation.glb',
        (avatarGltf) => {
            loader.load(
                'diamond.glb',
                (diamondGltf) => {
                    setupScene(avatarGltf, diamondGltf);
                    document.getElementById('avatar-loading').style.display = 'none';
                },
                undefined, // Progress callback not needed for the diamond model
                (error) => {
                    console.error('Error loading diamond model:', error);
                }
            );
        },
        (xhr) => {
            const percentCompletion = Math.round((xhr.loaded / xhr.total) * 100);
            document.getElementById('avatar-loading').innerText = `LOADING... ${percentCompletion}%`;
            console.log(`Loading model... ${percentCompletion}%`);
        },
        (error) => {
            console.error('Error loading avatar model:', error);
        }
    );
}

function setupScene(avatarGltf, diamondGltf) {
    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const container = document.getElementById('avatar-container');
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0.2, 0.5, 1);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minDistance = 3;
    controls.minPolarAngle = 1.4;
    controls.maxPolarAngle = 1.4;
    controls.target = new THREE.Vector3(0, 0.75, 0);
    controls.update();

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight());

    const spotlight = new THREE.SpotLight(0xffffff, 20, 8, 1);
    spotlight.penumbra = 0.5;
    spotlight.position.set(0, 4, 2);
    spotlight.castShadow = true;
    scene.add(spotlight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2);
    keyLight.position.set(1, 1, 2);
    keyLight.lookAt(new THREE.Vector3());
    scene.add(keyLight);

    const avatar = avatarGltf.scene;
    avatar.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    scene.add(avatar);

    const diamond = diamondGltf.scene;
    diamond.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    diamond.scale.set(0.5, 0.5, 0.5); // Make the diamond smaller
    diamond.position.set(-1, 0.5, 0); // Move the diamond to the left
    scene.add(diamond);

    const groundGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 64);
    const groundMaterial = new THREE.MeshStandardMaterial();
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.castShadow = false;
    groundMesh.receiveShadow = true;
    groundMesh.position.y -= 0.05;
    scene.add(groundMesh);

    const mixer = new THREE.AnimationMixer(avatar);
    const clips = avatarGltf.animations;
    const waveClip = THREE.AnimationClip.findByName(clips, 'pointing');
    const stumbleClip = THREE.AnimationClip.findByName(clips, 'dancing');

    if (waveClip && stumbleClip) {
        const waveAction = mixer.clipAction(waveClip);
        const stumbleAction = mixer.clipAction(stumbleClip);

        let isStumbling = false;
        const raycaster = new THREE.Raycaster();
        container.addEventListener('mousedown', (ev) => {
            const coords = {
                x: (ev.offsetX / container.clientWidth) * 2 - 1,
                y: -(ev.offsetY / container.clientHeight) * 2 + 1
            };

            raycaster.setFromCamera(coords, camera);
            const intersections = raycaster.intersectObject(avatar, true);

            if (intersections.length > 0) {
                if (isStumbling) return;

                isStumbling = true;
                stumbleAction.reset();
                stumbleAction.play();
                waveAction.crossFadeTo(stumbleAction, 0.3);

                setTimeout(() => {
                    waveAction.reset();
                    waveAction.play();
                    stumbleAction.crossFadeTo(waveAction, 1);
                    setTimeout(() => isStumbling = false, 1000);
                }, 4000);
            }
        });
    }

    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    if (waveClip) {
        const waveAction = mixer.clipAction(waveClip);
        waveAction.play();
    }

    const clock = new THREE.Clock();
    function animate() {
        requestAnimationFrame(animate);
        mixer.update(clock.getDelta());
        renderer.render(scene, camera);
    }

    animate();
}
