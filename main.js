import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf6f5f2);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(7, 7, 7);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

class Ground extends THREE.Mesh {
  constructor({
    width,
    height,
    occupied = false,
    depth,
    widthSegments = width,
    depthSegments = height,
    receiveShadow = false,
    color = "#0000ff",
    position = { x: 0, y: 0, z: 0 },
  }) {
    super(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshStandardMaterial({ color })
    );
    this.receiveShadow = receiveShadow;
    this.occupied = occupied;
    this.height = height;
    this.width = width;
    this.depth = depth;

    this.position.set(position.x, position.y, position.z);

    this.bottom = this.position.y - this.height / 2;
    this.top = this.position.y + this.height / 2;

    this.right = this.position.x + this.width / 2;
    this.left = this.position.x - this.width / 2;

    this.front = this.position.z + this.depth / 2;
    this.back = this.position.z - this.depth / 2;
  }
}

class Box extends Ground {
  constructor({
    width,
    height,
    depth,
    receiveShadow = false,
    castShadow = false,
    color = "#00ff00",
    velocity = { x: 0, y: 0, z: 0 },
    position = { x: 0, y: 0, z: 0 },
  }) {
    super({
      width,
      height,
      depth,
      receiveShadow,
      color,
      position,
    });
    this.castShadow = castShadow;
    this.velocity = velocity;
    this.gravity = -0.005;

    this.movementOnNegativeX = true;
    this.movementOnPositiveX = true;
    this.movementOnPositiveZ = true;
    this.movementOnNegativeZ = true;
  }
  updateSides() {
    this.bottom = this.position.y - this.height / 2;
    this.top = this.position.y + this.height / 2;

    this.right = this.position.x + this.width / 2;
    this.left = this.position.x - this.width / 2;

    this.front = this.position.z + this.depth / 2;
    this.back = this.position.z - this.depth / 2;
  }

  update({ center_ground, up_store, right_store, left_store, down_store }) {
    this.updateSides();

    this.position.x += this.velocity.x;
    this.position.z += this.velocity.z;

    this.applyGravity({
      center_ground,
      up_store,
      right_store,
      left_store,
      down_store,
    });
  }

  /**
   * Applies gravity to the object and updates its position accordingly.
   */
  applyGravity({
    center_ground,
    up_store,
    right_store,
    left_store,
    down_store,
  }) {
    this.velocity.y += this.gravity;
    if (
      collisionWithGround({
        box: this,
        center_ground,
        up_store,
        right_store,
        left_store,
        down_store,
      })
    ) {
      /**
       * Reduces the y component of the velocity by 60%.
       */
      this.velocity.y *= 0.6;
      this.velocity.y = -this.velocity.y;
    } else {
      /**
       * Updates the y position of the object by adding the y component of the velocity.
       */
      this.position.y += this.velocity.y;
    }
  }
}

function collisionWithGround({
  box,
  center_ground,
  up_store,
  right_store,
  left_store,
  down_store,
}) {
  const limit = 0.2;
  const xCollision =
    box.front >= center_ground.back &&
    box.back <= center_ground.front &&
    box.right >= left_store.left &&
    box.left <= right_store.right;
  const yCollision =
    box.bottom + box.velocity.y <= center_ground.top &&
    box.top >= center_ground.bottom;
  const xUpAndDownCollision =
    (box.front <= center_ground.back || box.back >= center_ground.front) &&
    box.right >= up_store.left &&
    box.left <= up_store.right;
  const zTopCollision =
    box.front >= up_store.back && box.back <= down_store.front;
  const upAndDownStoresCollisions = xUpAndDownCollision && zTopCollision;
  const leftCenterAndRightStoresCollisions = xCollision;

  const nearLeftXCollision = box.right - (box.width + limit) >= left_store.left;
  const nearRightXCollision =
    box.left + (box.width + limit) <= right_store.right;

  const nearUpAndDownLeftXCollision =
    box.right - (box.width + limit) >= up_store.left;
  const nearUpAndDownRightXCollision =
    box.left + (box.width + limit) <= up_store.right;

  const nearXCollision =
    box.front >= center_ground.back &&
    box.back <= center_ground.front &&
    nearLeftXCollision &&
    nearRightXCollision;

  const nearXUpAndDownCollision =
    (box.front <= center_ground.back || box.back >= center_ground.front) &&
    nearUpAndDownLeftXCollision &&
    nearUpAndDownRightXCollision;

  const nearZTopCollisionUp = box.front - (box.depth + limit) >= up_store.back;
  const nearZTopCollisionDown =
    box.back + (box.depth + limit) <= down_store.front;

  const nearZTopCollision = nearZTopCollisionUp && nearZTopCollisionDown;

  if (!((nearZTopCollision && nearXUpAndDownCollision) || nearXCollision)) {
    if (!nearZTopCollisionUp) box.movementOnNegativeZ = false;
    if (!nearZTopCollisionDown) box.movementOnPositiveZ = false;
    box.velocity.z = 0;
  } else {
    box.movementOnNegativeZ = true;
    box.movementOnPositiveZ = true;
  }

  // Check if the box is out of bounds on the x axis.
  if (!(nearXCollision || nearXUpAndDownCollision)) {
    if (!nearLeftXCollision) box.movementOnNegativeX = false;
    if (!nearRightXCollision) box.movementOnPositiveX = false;
    if (!nearUpAndDownLeftXCollision) box.movementOnNegativeX = false;
    if (!nearUpAndDownRightXCollision) box.movementOnPositiveX = false;
    box.velocity.x = 0;
  } else {
    box.movementOnNegativeX = true;
    box.movementOnPositiveX = true;
  }
  return (
    (leftCenterAndRightStoresCollisions || upAndDownStoresCollisions) &&
    yCollision
  );
}

const addToScene = (obj) => {
  scene.add(obj);
};
const createGround = ({ position, color, dimensions }) => {
  let ground = new Box({
    width: dimensions.x,
    height: dimensions.y,
    depth: dimensions.z,
    color: color,
    position: position,
    receiveShadow: true,
  });
  return ground;
};
// }

// ----------------------------------------------------------------------------
// LANDSCAPE
// ----------------------------------------------------------------------------

const Vacuum = new Box({
  width: 1,
  height: 1,
  depth: 1,
  position: { x: 3, y: 0, z: 3 },
  velocity: { x: 0, y: -0.01, z: 0 },
  color: "#808080",
  castShadow: true,
});
addToScene(Vacuum);
// addToScene(wall);
const room_dimensions = { x: 8, y: 0.4, z: 8 };
const room_default_color = "#0000ff";

// GROUND IN THE CENTER

const isOcuppied = () => {
  return Math.random() < 0.5;
};
const center_ground = new Ground({
  width: room_dimensions.x,
  height: room_dimensions.y,
  depth: room_dimensions.z,
  color: room_default_color,
  position: { x: 0, y: -2, z: 0 },
  receiveShadow: true,
});

// STORES

// -> Up Store

const up_store = new Ground({
  width: room_dimensions.x,
  height: room_dimensions.y,
  depth: room_dimensions.z,
  color: room_default_color,
  occupied: isOcuppied(),
  position: { x: 0, y: -2, z: -8 },
  receiveShadow: true,
});
// const up_store = createGround({
//   position: {
//     x: 0,
//     y: -2,
//     z: -8,
//   },
//   color: "#0000ff",
//   dimensions: rooms_dimensions,
// });
// -> Right Store

const right_store = new Ground({
  width: room_dimensions.x,
  height: room_dimensions.y,
  depth: room_dimensions.z,
  occupied: isOcuppied(),
  color: room_default_color,
  position: { x: 8, y: -2, z: 0 },
  receiveShadow: true,
});
// const right_store = createGround({
//   position: {
//     x: 8,
//     y: -2,
//     z: 0,
//   },
//   color: "#0000ff",
//   dimensions: rooms_dimensions,
// });
// -> Left Store

const left_store = new Ground({
  width: room_dimensions.x,
  height: room_dimensions.y,
  depth: room_dimensions.z,
  color: room_default_color,
  occupied: isOcuppied(),
  position: { x: -8, y: -2, z: 0 },
  receiveShadow: true,
});
// const left_store = createGround({
//   position: {
//     x: -8,
//     y: -2,
//     z: 0,
//   },
//   color: "#0000ff",
//   dimensions: rooms_dimensions,
// });

// -> Down Store
const down_store = new Ground({
  width: room_dimensions.x,
  height: room_dimensions.y,
  depth: room_dimensions.z,
  occupied: isOcuppied(),
  color: room_default_color,
  position: { x: 0, y: -2, z: 8 },
  receiveShadow: true,
});
// const down_store = createGround({
//   position: {
//     x: 0,
//     y: -2,
//     z: 8,
//   },
//   color: "#0000ff",
//   dimensions: rooms_dimensions,
// });

addToScene(center_ground);
addToScene(up_store);
addToScene(right_store);
addToScene(left_store);
addToScene(down_store);

const stores = [up_store, right_store, left_store, down_store];

// ----------------------------------------------------------------------------
// THRASH GENERATION
// ----------------------------------------------------------------------------

const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
const thrashes = [];
const generateThrashOnStore = (store) => {
  const numberOfThrash = getRandomInt(1, 4);
  for (let i = 0; i < numberOfThrash; i++) {
    let randomX = getRandomInt(
      store.position.x - store.width / 2 + 1,
      store.position.x + store.width / 2 - 1
    );
    let randomZ = getRandomInt(
      store.position.z - store.depth / 2 + 1,
      store.position.z + store.depth / 2 - 1
    );
    let thrash = new Box({
      width: 0.3,
      height: 0.5,
      depth: 0.3,
      position: { x: randomX, y: -1.5, z: randomZ },
      color: "#ff0000",
    });
    thrashes.push(thrash);
    addToScene(thrash);
  }
};

const generationOfThrashOnStores = ({ stores }) => {
  for (let i = 0; i < stores.length; i++) {
    let randomNum = Math.random();
    if (randomNum < 0.8) {
      generateThrashOnStore(stores[i]);
    }
  }
};
generationOfThrashOnStores({
  stores: stores,
});

// ----------------------------------------------------------------------------
// LIGHT
// ----------------------------------------------------------------------------
const directLight = new THREE.DirectionalLight(0xffffff, 1);
directLight.position.y = 3;
directLight.position.z = 2;
directLight.castShadow = true;
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
addToScene(directLight);
addToScene(ambientLight);

// camera.position.z = 5;
// OCCUPIED AND NOT OCCUPIED STORES LIGHTS

const createSpotLight = ({
  color,
  intensity,
  distance,
  position = { x: 0, y: 0, z: 0 },
}) => {
  let spotLight = new THREE.PointLight(color, intensity, distance);
  spotLight.position.set(position.x, position.y, position.z);
  return spotLight;
};

const upStoreLight = createSpotLight({
  color: 0x3cb043,
  intensity: 100,
  distance: 60,
  position: {
    x: up_store.position.x,
    y: up_store.position.y + 1,
    z: up_store.position.z,
  },
});
const rightStoreLight = createSpotLight({
  color: 0x3cb043,
  intensity: 100,
  distance: 60,
  position: {
    x: right_store.position.x,
    y: right_store.position.y + 1,
    z: right_store.position.z,
  },
});
const leftStoreLight = createSpotLight({
  color: 0x3cb043,
  intensity: 100,
  distance: 60,
  position: {
    x: left_store.position.x,
    y: left_store.position.y + 1,
    z: left_store.position.z,
  },
});
const downStoreLight = createSpotLight({
  color: 0x3cb043,
  intensity: 100,
  distance: 60,
  position: {
    x: down_store.position.x,
    y: down_store.position.y + 1,
    z: down_store.position.z,
  },
});
addToScene(upStoreLight);
addToScene(rightStoreLight);
addToScene(leftStoreLight);
addToScene(downStoreLight);

const updateLightColors = () => {
  if (up_store.occupied) {
    upStoreLight.color.set(0xff0000);
  } else {
    upStoreLight.color.set(0x3cb043);
  }
  if (right_store.occupied) {
    rightStoreLight.color.set(0xff0000);
  } else {
    rightStoreLight.color.set(0x3cb043);
  }
  if (left_store.occupied) {
    leftStoreLight.color.set(0xff0000);
  } else {
    leftStoreLight.color.set(0x3cb043);
  }
  if (down_store.occupied) {
    downStoreLight.color.set(0xff0000);
  } else {
    downStoreLight.color.set(0x3cb043);
  }
};
downStoreLight.color.set(0xff0000);
updateLightColors();

// ----------------------------------------------------------------------------
// VACUUM COLLISION AND MOVEMENT CONTROL
// ----------------------------------------------------------------------------

function aspirarBasura(aspiradora, basura, basurasArray) {
  const posAspiradora = aspiradora.position;
  const posBasura = basura.position; // Suponiendo que las coordenadas de la basura son {x, z}

  // Obtener los límites de la aspiradora
  const limitesAspiradora = {
    xMin: posAspiradora.x - aspiradora.width / 2,
    xMax: posAspiradora.x + aspiradora.width / 2,
    zMin: posAspiradora.z - aspiradora.depth / 2,
    zMax: posAspiradora.z + aspiradora.depth / 2,
  };

  // Comprobar si la basura está dentro de los límites de la aspiradora
  if (
    posBasura.x >= limitesAspiradora.xMin &&
    posBasura.x <= limitesAspiradora.xMax &&
    posBasura.z >= limitesAspiradora.zMin &&
    posBasura.z <= limitesAspiradora.zMax
  ) {
    // Eliminar la basura de la escena y del arreglo
    basura.visible = false;
    const index = basurasArray.indexOf(basura);
    console.log("Indice de la basura", index);
    if (index !== -1) {
      basurasArray.splice(index, 1);
      console.log(basurasArray);
      console.log("¡La aspiradora ha aspirado una basura!");
    }
  }
}

const moveToAPosition = (vacuum, position = { x: 0, y: 0, z: 0 }) => {
  console.log("ME EJECUTO");
  if (vacuum.position.x < position.x) {
    vacuum.velocity.x = 0.1;
  }
  else if (vacuum.position.x > position.x) {
    vacuum.velocity.x = -0.1;
  }
  else if (vacuum.position.z < position.z) {
    vacuum.velocity.z = 0.1;
  }
  else if (vacuum.position.z > position.z) {
    vacuum.velocity.z = -0.1;
  }
  else if (vacuum.position.x === position.x && vacuum.position.z === position.z) {
    vacuum.velocity.x = 0;
    vacuum.velocity.z = 0;
  }
};

// const cellPositions = [];
// const totalWidth = 24;
// const totalDepth = 24;
// const widthSegments = totalWidth;
// const depthSegments = totalDepth;
// const geometry = new THREE.BoxGeometry(
//   totalWidth,
//   0.1,
//   totalDepth,
//   widthSegments,
//   depthSegments
// );
// const material = new THREE.MeshBasicMaterial({
//   color: 0x00ff00,
//   wireframe: true,
// });
// const ground = new THREE.Mesh(geometry, material);
// scene.add(ground);

// function creadGridLines(size, divisions) {
//   const gridHelper = new THREE.GridHelper(size, divisions);
//   return gridHelper;
// }

// const gridLines = creadGridLines(24, 24);
// addToScene(gridLines);
// ----------------------------------------------------------------------------
// CONTROLS
// ----------------------------------------------------------------------------

const keys = {
  a: {
    pressed: false,
  },
  d: {
    pressed: false,
  },
  w: {
    pressed: false,
  },
  s: {
    pressed: false,
  },
};
window.addEventListener("keydown", (event) => {
  switch (event.code) {
    case "KeyA":
      keys.a.pressed = true;
      break;
    case "KeyD":
      keys.d.pressed = true;
      break;
    case "KeyW":
      keys.w.pressed = true;
      break;
    case "KeyS":
      keys.s.pressed = true;
      break;
  }
});

window.addEventListener("keyup", (event) => {
  switch (event.code) {
    case "KeyA":
      keys.a.pressed = false;
      break;
    case "KeyD":
      keys.d.pressed = false;
      break;
    case "KeyW":
      keys.w.pressed = false;
      break;
    case "KeyS":
      keys.s.pressed = false;
      break;
  }
});

function animate() {
  requestAnimationFrame(animate);
  // --------------------------------------------------
  // MOVIMIENTO
  // --------------------------------------------------
  Vacuum.velocity.x = 0;
  Vacuum.velocity.z = 0;
  // X -> Derecha(d) e Izquierda(a)
  if (keys.a.pressed && Vacuum.movementOnNegativeX) Vacuum.velocity.x -= 0.12;
  else if (keys.d.pressed && Vacuum.movementOnPositiveX)
    Vacuum.velocity.x += 0.12;
  // Z -> Arriba(w) y Abajo(s)
  if (keys.w.pressed && Vacuum.movementOnNegativeZ) Vacuum.velocity.z -= 0.12;
  else if (keys.s.pressed && Vacuum.movementOnPositiveZ)
    Vacuum.velocity.z += 0.12;
  moveToAPosition(Vacuum, { x: 0, y: 0, z: 0 });
  Vacuum.update({
    center_ground: center_ground,
    up_store: up_store,
    right_store: right_store,
    left_store: left_store,
    down_store: down_store,
  });
  console.log("VELOCIDAD", Vacuum.velocity.x);
  // --------------------------------------------------
  // THRASH SUCTION
  // --------------------------------------------------
  thrashes.forEach((thrash) => {
    aspirarBasura(Vacuum, thrash, thrashes);
  });

  //   moveToAPosition(Vacuum, { x: 0, y: 0, z: 0 });
  // --------------------------------------------------
  renderer.render(scene, camera);
}
//VIDEO: https://www.youtube.com/watch?v=sPereCgQnWQ (1:27:55)
animate();
