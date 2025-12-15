import * as T from "https://unpkg.com/three@0.164.0/build/three.module.js";

// Copilot generated the shaders and the boilerplate of the game. I implemented
// inifinite platfrom generation, score, the start screen, and camera controls.
// I also debugged Copilot's code as there were a few odd bugs it created (such
// as calling animate() whenever the play again button was clicked and thus 
// causing multiple animation loops to run simultaneously).

// Set up the window
/** @type {number} */ let wid = window.innerWidth;
/** @type {number} */ let ht = window.innerHeight;
/** @type {T.WebGLRenderer} */ let renderer = new T.WebGLRenderer({
    canvas: canvas,
    antialias: true
});

/** @type {T.OrbitControls} */ //let controls = new OrbitControls(
    //new T.PerspectiveCamera().position.set(0, 5, 10),
    //renderer.domElement);

renderer.setSize(wid, ht);
renderer.shadowMap.enabled = true;

let scene = new T.Scene();
const woodVertexShader = `
    varying vec2 vUv;
    varying vec3 vPos;
    void main() {
        vUv = uv;
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const woodFragmentShader = `
    varying vec2 vUv;
    varying vec3 vPos;
    void main() {
        // Wood ring pattern
        float rings = sin(12.0 * length(vPos.xz) + vPos.y * 0.5);
        float wood = 0.5 + 0.5 * rings;
        // Add some noise
        float noise = fract(sin(dot(vPos.xz, vec2(12.9898,78.233))) * 43758.5453);
        wood += 0.08 * noise;
        // Wood color
        vec3 color1 = vec3(0.36, 0.22, 0.09);
        vec3 color2 = vec3(0.55, 0.27, 0.07);
        vec3 woodColor = mix(color1, color2, wood);
        gl_FragColor = vec4(woodColor, 1.0);
    }
`;

const woodMaterial = new T.ShaderMaterial({
    vertexShader: woodVertexShader,
    fragmentShader: woodFragmentShader
});


// Grass shader material
const grassVertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const grassFragmentShader = `
    varying vec2 vUv;
    void main() {
        float stripes = smoothstep(0.48, 0.52, sin(vUv.x * 40.0) * 0.5 + 0.5);
        vec3 baseColor = mix(vec3(0.13, 0.55, 0.13), vec3(0.18, 0.8, 0.44), vUv.y);
        baseColor = mix(baseColor, baseColor * 1.2, stripes * 0.2);
        float noise = fract(sin(dot(vUv * 100.0, vec2(12.9898,78.233))) * 43758.5453);
        baseColor *= 0.95 + 0.1 * noise;
        gl_FragColor = vec4(baseColor, 1.0);
    }
`;

const grassMaterial = new T.ShaderMaterial({
    vertexShader: grassVertexShader,
    fragmentShader: grassFragmentShader
});

let basicBtn;
let shaderBtn;
let platformMat;
let ballMat;
let platforms; 
let player;
let platformGeo;
let firstPlatform;
let firstPlatformMesh;
let score = -1;
let setup = false;

function sceneSetup(){
    scene = new T.Scene();
    scene.background = new T.Color(0.5, 0.8, 0.9);
    let light = new T.DirectionalLight(0xffffff, 1);
    light.position.set(10, 20, 10);
    light.castShadow = true;
    scene.add(light);

    // Platforms
    platforms = [];
    platformGeo = new T.BoxGeometry(4, 0.5, 4);
    firstPlatformMesh = new T.Mesh(platformGeo, platformMat);
    firstPlatform = {mesh: firstPlatformMesh, touched: false};
    firstPlatformMesh.position.set(0, 0.25, -2);
    scene.add(firstPlatformMesh);
    platforms.push(firstPlatform);
    for (let i = 0; i < 10; i++) {
        let platMesh = new T.Mesh(platformGeo, platformMat);
        let plat = {mesh: platMesh, touched: false};
        platMesh.position.set(
            (Math.random() - 0.5) * 8,
            Math.random() * 3 - 1.5,
            -10 - i * 8
        );
        platMesh.castShadow = true;
        platMesh.receiveShadow = true;
        scene.add(platMesh);
        platforms.push(plat);
    }

    // Player
    let playerGeo = new T.SphereGeometry(0.5, 32, 32);
    player = new T.Mesh(playerGeo, ballMat);
    player.position.set(0, 1, -2);
    player.castShadow = true;
    scene.add(player);
    score = -1;
}

function start(){
    let startScreen;
    if(!document.getElementById("startScreen")){
        startScreen = document.createElement("div");
        startScreen.id = "startScreen";
        startScreen.style.position = "fixed";
        startScreen.style.top = "0";
        startScreen.style.left = "0";
        startScreen.style.width = "100vw";
        startScreen.style.height = "100vh";
        startScreen.style.background = "rgba(32, 125, 255, 1)";
        startScreen.style.display = "flex";
        startScreen.style.flexDirection = "column";
        startScreen.style.justifyContent = "center";
        startScreen.style.alignItems = "center";
        startScreen.style.zIndex = "1000";
        startScreen.innerHTML = `
            <h1 style="color:white; font-size:3em; margin-bottom:0.5em;">Parkour Game</h1>
            <button id="basic" style="font-size:1.5em; padding:0.5em 2em;">Basic</button>
            <button id="shaderBtn" style="font-size:1.5em; padding:0.5em 2em; margin-top:1em;">Shaders</button>
            `;
        document.body.appendChild(startScreen);
        basicBtn = document.getElementById("basic");
        shaderBtn = document.getElementById("shaderBtn");
    }   
    basicBtn.addEventListener("click", () => {
        document.body.removeChild(document.getElementById("startScreen"));
        platformMat = new T.MeshStandardMaterial({ color: 0x00FF00 });
        ballMat = new T.MeshStandardMaterial({ color: 0x0000ff, metalness: 0.8, 
        roughness: 0.2});
        sceneSetup();
        setup = true;
    });
    shaderBtn.addEventListener("click", () => {
        document.body.removeChild(document.getElementById("startScreen"));
        platformMat = grassMaterial;
        ballMat = woodMaterial;
        sceneSetup();
        setup = true;
    });
}




document.body.appendChild(renderer.domElement);

// Camera setup
let camera = new T.PerspectiveCamera(75, wid / ht, 0.1, 1000);
camera.position.set(0, 2, 10);
camera.lookAt(0, 1, 0);

// Ground
/*let groundGeo = new T.BoxGeometry(20, 1, 100);
let groundMat = new T.MeshStandardMaterial({ color: 0x228B22 });
let ground = new T.Mesh(groundGeo, groundMat);
ground.position.set(0, -0.5, 0);
ground.receiveShadow = true;
scene.add(ground);*/



// Controls
let keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

let velocity = { x: 0, y: 0, z: 0 };
let onGround = false;

function checkPlatformCollision() {
    onGround = false;
    // Check ground
    /*if (player.position.y - 0.5 <= 0) {
        player.position.y = 0.5;
        velocity.y = 0;
        onGround = true;
    }*/
    // Check platforms
    for (let i = 0; i < platforms.length; i++) {
        let plat = platforms[i];
        let px = player.position.x, pz = player.position.z;
        let bx = plat.mesh.position.x, bz = plat.mesh.position.z;

        if (
            Math.abs(px - bx) < 2 &&
            Math.abs(pz - bz) < 2 &&
            Math.abs(player.position.y - (plat.mesh.position.y + 0.5)) < 0.55          
        ) {
            player.position.y = plat.mesh.position.y + 1;
            velocity.y = 0;
            onGround = true;
            if(plat.touched === false){
                score++;
                plat.touched = true;
                console.log("Score: " + score);
                //if(score >= 5){
                //    scene.remove(platforms[0].mesh);
                //    for(let i = 0; i < platforms.length - 2; i++){
                //        platforms[i] = platforms[i+1]; 
                //    }
                let newPlatMesh = new T.Mesh(platformGeo, platformMat);
                let newPlat = {mesh: newPlatMesh, touched: false};
                //let ranX = (Math.random() - 0.5) * 8;
                //newPlatMesh.position.set(
                //    platforms[platforms.length-1].mesh.position.x + ranX + (ranX > 0 ? 5 : -5),
                //    0.25,
                //    platforms[platforms.length-1].mesh.position.z - Math.random() * 8 - 5
                //);
                newPlatMesh.position.set(
                    (Math.random() - 0.5) * 8,
                    Math.random() * 3 - 1.5,
                    -10 - (platforms.length-1) * 8
                );
                newPlatMesh.castShadow = true;
                newPlatMesh.receiveShadow = true;
                scene.add(newPlatMesh);
                platforms.push(newPlat);
            }
        }
    }
    if(player.position.y < -10 && document.getElementById("gameOverOverlay") == null){
        gameOver();
    }
}

let cameraDistanceX = 0;
let cameraDistanceY = 0;
let cameraDistanceZ = 0;


function gameOver(){
    // Create overlay
    let overlay;
    if(!document.getElementById("gameOverOverlay")){
        overlay = document.createElement("div");
        overlay.id = "gameOverOverlay";
        overlay.style.position = "fixed";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100vw";
        overlay.style.height = "100vh";
        overlay.style.background = "rgba(0, 0, 0, 0.4)";
        overlay.style.display = "flex";
        overlay.style.flexDirection = "column";
        overlay.style.justifyContent = "center";
        overlay.style.alignItems = "center";
        overlay.style.zIndex = "1000";
        overlay.innerHTML = `
            <h1 style="color:white; font-size:3em; margin-bottom:0.5em;">Game Over</h1>
            <p style="color:white; font-size:2em; margin-bottom:1em;">Score: ${score}</p>
            <button id="playAgainBtn" style="font-size:1.5em; padding:0.5em 2em;">Play Again</button>
        `;
        document.body.appendChild(overlay);
    }   

    // Play again logic
    let playAgainBtn = document.getElementById("playAgainBtn");
    playAgainBtn.addEventListener("click", () => {

        // Reset player position and velocity
        player.position.set(0, 1, -2);
        velocity.x = 0;
        velocity.y = 0;
        velocity.z = 0;

        // Reset platforms
        for (let plat of platforms) {
            scene.remove(plat.mesh);
        }
        platforms = [];
        let firstPlatformMesh = new T.Mesh(platformGeo, platformMat);
        let firstPlatform = {mesh: firstPlatformMesh, touched: false};
        firstPlatformMesh.position.set(0, 0.25, -2);
        scene.add(firstPlatformMesh);
        platforms.push(firstPlatform);
        for (let i = 0; i < 10; i++) {
            let platMesh = new T.Mesh(platformGeo, platformMat);
            let plat = {mesh: platMesh, touched: false};
            platMesh.position.set(
                (Math.random() - 0.5) * 8,
                0.25,
                -10 - i * 8
            );
            platMesh.castShadow = true;
            platMesh.receiveShadow = true;
            scene.add(platMesh);
            platforms.push(plat);
        }

        // Reset score
        score = 0;

        // Reset camera
        cameraDistanceX = 0;
        cameraDistanceY = 0;
        cameraDistanceZ = 0;

        // Remove overlay
        document.body.removeChild(overlay);
        start();
    });
    // Pause animation by not calling animate again
    // (animate will not be called again until Play Again is pressed)
}

function animate() {
    if(setup){
        let scoreTxt = document.getElementById("scoreTxt");
        //scoreTxt.textContent = " Score: " + score;
        // Movement
        let speed = 0.15;
        if (keys["a"]) velocity.x = -speed;
        else if (keys["d"]) velocity.x = speed;
        else velocity.x = 0;

        if (keys["w"]) velocity.z = -speed;
        else if (keys["s"]) velocity.z = speed;
        else velocity.z = 0;

        // Camera movement
        if(keys["arrowup"]) cameraDistanceZ -= 0.3;
        else if(keys["arrowdown"]) cameraDistanceZ += 0.3;

        if(keys["arrowleft"]) cameraDistanceX -= 0.3;
        else if(keys["arrowright"]) cameraDistanceX += 0.3;
        
        if(keys["shift"] && keys["arrowup"]) cameraDistanceY += 0.3;
        else if(keys["shift"] && keys["arrowdown"]) cameraDistanceY -= 0.3;

        if(keys["r"]){
            cameraDistanceX = 0;
            cameraDistanceY = 0;
            cameraDistanceZ = 0;
        }

        // Jump
        if ((keys[" "]) && onGround) {
            velocity.y = 0.25;
            onGround = false;
        }

        // Gravity
        if (!onGround)
        velocity.y -= 0.012;

        // Update player position
        player.position.x += velocity.x;
        player.position.z += velocity.z;
        player.position.y += velocity.y;

        checkPlatformCollision();

        // Camera follows player
        camera.position.x = player.position.x + cameraDistanceX;
        camera.position.z = player.position.z + 10 + cameraDistanceZ;
        camera.position.y = player.position.y + 2 + cameraDistanceY;
        camera.lookAt(player.position.x, player.position.y, player.position.z);

        renderer.render(scene, camera);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight, false);

    }
    requestAnimationFrame(animate);
}
start();
animate();