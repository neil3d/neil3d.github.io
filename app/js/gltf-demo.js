const WIDTH = 800;
const HEIGHT = 480;

var loader = new THREE.GLTFLoader();

loader.load(
	// resource URL
	'/assets/img/gltf/gltf-truck/CesiumMilkTruck.gltf',
	//'/assets/img/gltf/gltf-box/Box.gltf',


	// called when the resource is loaded
	function (gltf) {
		start(gltf);
	},

	// called when loading is in progresses
	function (xhr) {
		console.log((xhr.loaded / xhr.total * 100) + '% loaded');
	},

	// called when loading has errors
	function (error) {
		console.log('An error happened');
		console.log(error);
	}
);

function createSceneObjects(scene) {
	var hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
	hemiLight.color.setHSL(0.6, 1, 0.6);
	hemiLight.groundColor.setHSL(0.095, 1, 0.75);
	hemiLight.position.set(0, 50, 0);
	scene.add(hemiLight);

	//
	var dirLight = new THREE.DirectionalLight(0xffffff, 1);
	dirLight.color.setHSL(0.1, 1, 0.95);
	dirLight.position.set(-1, 1.75, 1);
	dirLight.position.multiplyScalar(30);
	scene.add(dirLight);
	dirLight.castShadow = true;
	dirLight.shadow.mapSize.width = 2048;
	dirLight.shadow.mapSize.height = 2048;
	var d = 10;
	dirLight.shadow.camera.left = -d;
	dirLight.shadow.camera.right = d;
	dirLight.shadow.camera.top = d;
	dirLight.shadow.camera.bottom = -d;
	dirLight.shadow.camera.far = 3500;
	dirLight.shadow.bias = -0.0001;

	// GROUND
	var groundGeo = new THREE.PlaneBufferGeometry(100, 100);
	var groundMat = new THREE.MeshPhongMaterial({ color: 0xffffff, specular: 0x050505 });
	groundMat.color.setHSL(0.095, 1, 0.75);
	var ground = new THREE.Mesh(groundGeo, groundMat);
	ground.rotation.x = -Math.PI / 2;
	scene.add(ground);
	ground.receiveShadow = true;
}

function start(gltf) {

	gltf.scene.traverse(function (child) {
		if (child.isMesh) {
			child.castShadow = true;
		}
	});

	var scene = new THREE.Scene();
	scene.add(gltf.scene);

	scene.background = new THREE.Color().setHSL(0.6, 0, 1);
	scene.fog = new THREE.Fog(scene.background, 1, 5000);

	var camera = new THREE.PerspectiveCamera(60, WIDTH / HEIGHT, 0.1, 1000);
	camera.position.set(0, 2, 8);

	var controls = new THREE.OrbitControls(camera);
	controls.target.set(0, 0, 0);
	controls.update();

	createSceneObjects(scene);

	var renderer = new THREE.WebGLRenderer();
	renderer.setSize(WIDTH, HEIGHT);
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFShadowMap;
	document.getElementById("demo").appendChild(renderer.domElement);


	function animate() {
		requestAnimationFrame(animate);
		renderer.render(scene, camera);
	}
	animate();
}