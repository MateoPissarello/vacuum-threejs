import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// ----------------------------------------------------------------------------
// MESSAGE DIV ELEMENT
// ----------------------------------------------------------------------------
const container = document.createElement("div");
const infoBox = document.createElement("div");
infoBox.innerText = "¡Bienvenido a la aspiradora inteligente!";

container.style.position = "relative";
container.style.width = "100vw";
container.style.height = "100vh";

infoBox.style.position = "absolute";
infoBox.style.top = "10px";
infoBox.style.left = "10px";
infoBox.style.padding = "10px";
infoBox.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
infoBox.style.borderRadius = "10px";
infoBox.style.border = "1px solid black";
infoBox.style.zIndex = "10";

document.body.style.overflow = "hidden";
document.body.appendChild(container);
container.appendChild(infoBox);

// ----------------------------------------------------------------------------
// SCENE, CAMERA AND RENDERER
// ----------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf6f5f2);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(10, 14, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

class Ground extends THREE.Mesh {
  constructor({
    width,
    height,
    occupied = false,
    depth,
    name,
    entry = { x: 0, z: 0 },
    receiveShadow = false,
    color = "#0000ff",
    position = { x: 0, y: 0, z: 0 },
  }) {
    super(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshStandardMaterial({ color })
    );
    this.receiveShadow = receiveShadow;
    this.name = name;
    this.entry = entry;
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
  position: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: -0.01, z: 0 },
  color: "#808080",
  castShadow: true,
});
addToScene(Vacuum);
// addToScene(wall);
const room_dimensions = { x: 8, y: 0.4, z: 8 };
const room_default_color = "#000000";

// GROUND IN THE CENTER

const isOcuppied = () => {
  return Math.random() < 0.5;
};
const center_ground = new Ground({
  width: room_dimensions.x,
  height: room_dimensions.y,
  depth: room_dimensions.z,
  name: "center_ground",
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
  name: "up_store",
  occupied: isOcuppied(),
  position: { x: 0, y: -2, z: -8 },
  entry: { x: 0, z: -4 },
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
  name: "right_store",
  color: room_default_color,
  position: { x: 8, y: -2, z: 0 },
  entry: { x: 4, z: 0 },
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
  name: "left_store",
  occupied: isOcuppied(),
  position: { x: -8, y: -2, z: 0 },
  entry: { x: -4, z: 0 },
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
  name: "down_store",
  entry: { x: 0, z: 4 },
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

const charging_station = new Ground({
  width: 1,
  height: 0.5,
  depth: 1,
  color: "#00ff00",
  name: "charging_station",
  position: { x: 0, y: -2, z: 0 },
  receiveShadow: true,
});
addToScene(center_ground);
addToScene(charging_station);
addToScene(up_store);
addToScene(right_store);
addToScene(left_store);
addToScene(down_store);

const stores = [up_store, right_store, left_store, down_store];

// ----------------------------------------------------------------------------
// THRASH GENERATION AND SUCTION
// ----------------------------------------------------------------------------

const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
let thrashes = {
  up_store: [],
  right_store: [],
  left_store: [],
  down_store: [],
  total_thrashes: [],
};
const generateThrashOnStore = (store, name) => {
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
      color: "#ffff00",
    });
    thrashes["total_thrashes"].push(thrash);
    thrashes[name].push(thrash);
    addToScene(thrash);
  }
};

const generationOfThrashOnStores = ({ stores }) => {
  for (let i = 0; i < stores.length; i++) {
    let randomNum = Math.random();
    if (randomNum < 0.8) {
      generateThrashOnStore(stores[i], stores[i].name);
    }
  }
};
generationOfThrashOnStores({
  stores: stores,
});

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
    if (index !== -1) {
      basurasArray.splice(index, 1);
      // console.log("¡La aspiradora ha aspirado una basura!");
    }
  }
}

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
  intensity = 80,
  distance = 10,
  position = { x: 0, y: 0, z: 0 },
}) => {
  let spotLight = new THREE.PointLight(color, intensity, distance);
  spotLight.position.set(position.x, position.y, position.z);
  return spotLight;
};

const upStoreLight = createSpotLight({
  color: 0x3cb043,
  position: {
    x: up_store.position.x,
    y: up_store.position.y + 1,
    z: up_store.position.z,
  },
});
const rightStoreLight = createSpotLight({
  color: 0x3cb043,
  position: {
    x: right_store.position.x,
    y: right_store.position.y + 1,
    z: right_store.position.z,
  },
});
const leftStoreLight = createSpotLight({
  color: 0x3cb043,
  position: {
    x: left_store.position.x,
    y: left_store.position.y + 1,
    z: left_store.position.z,
  },
});
const downStoreLight = createSpotLight({
  color: 0x3cb043,
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

let occupiedColor = 0xff0000;
let notOccupiedColor = 0x3cb043;
const updateLightColors = () => {
  if (up_store.occupied) {
    upStoreLight.color.set(occupiedColor);
  } else {
    upStoreLight.color.set(notOccupiedColor);
  }
  if (right_store.occupied) {
    rightStoreLight.color.set(occupiedColor);
  } else {
    rightStoreLight.color.set(notOccupiedColor);
  }
  if (left_store.occupied) {
    leftStoreLight.color.set(occupiedColor);
  } else {
    leftStoreLight.color.set(notOccupiedColor);
  }
  if (down_store.occupied) {
    downStoreLight.color.set(occupiedColor);
  } else {
    downStoreLight.color.set(notOccupiedColor);
  }
};

// ----------------------------------------------------------------------------
// VACUUM COLLISION AND MOVEMENT CONTROL
// ----------------------------------------------------------------------------

let isZigzagging = false;
let isMovingToEntry = true;
let currentIndex = 0;
let allStoresCleaned = false;
let isWaiting = false;
let pendingIndex = 0;
let arrivedOnLastPosition = false;
let isGoingToCharge = false;
let isCleaning = false; // Variable para controlar si la aspiradora está limpiando
let clean = [];
let pendingCleaning = []; // Almacenar las bodegas que no se pudieron limpiar inicialmente
let battery = 100;
let cleanedStoresCount = 0;
let chargingStationPosition = { x: 0, y: Vacuum.position.y, z: -2 }; // Posición de la estación de carga

const moveToAPosition = async (vacuum, targetPosition) => {
  let target = new THREE.Vector3(
    targetPosition.x,
    vacuum.position.y,
    targetPosition.z
  );
  // console.log("Me muevo a ", target);
  let direction = target.clone().sub(vacuum.position).normalize();
  let distance = vacuum.position.distanceTo(target);

  if (distance > 0.1) {
    vacuum.position.add(direction.multiplyScalar(0.08));
    return false;
  } else {
    vacuum.position.set(targetPosition.x, vacuum.position.y, targetPosition.z);
    return true;
  }
};

const cleanStoreZigzag = async (store) => {
  const step = 1;
  const rows = Math.floor(store.width / step);
  const cols = Math.floor(store.depth / step);
  let direction = 1; // 1 for moving forward, -1 for moving backward
  let currentX = store.left + step / 2;
  let currentZ = store.back + step / 2;
  const tolerance = 0.1; // Umbral de tolerancia

  if (!isGoingToCharge) {
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        Vacuum.position.set(currentX, Vacuum.position.y, currentZ);
        await delay(50); // Simulate the cleaning time
        currentX += direction * step;
        debugger;
        // Verificar si hemos limpiado la mitad de la bodega con un umbral
        if (col === Math.floor(cols / 2) && row === 0) {
          cleanedStoresCount += 0.5;
          console.log("Media bodega limpia, incrementando contador en 0.5");
        }

        // Verificar si se debe ir a la estación de carga
        if (cleanedStoresCount % 2.5 === 0 && cleanedStoresCount > 0) {
          console.log("cleanedStoresCount", cleanedStoresCount);
          console.log("Limpié 2.5 bodegas, yendo a la estación de carga...");
          cleanedStoresCount = 0;
          isGoingToCharge = true;
          await goToChargingStation(Vacuum, {
            x: currentX,
            y: Vacuum.position.y,
            z: currentZ,
          });
          // Reset currentX and currentZ to resume cleaning after charging
          if (!isGoingToCharge) {
            currentX -= direction * step; // Correct currentX after charging
            direction *= -1; // Correct direction after charging
            currentZ -= step; // Correct currentZ after charging
          }
        }
      }
      direction *= -1; // Change direction
      currentZ += step;
      currentX += direction * step; // Move to the next row
    }
  }
  await moveToAPosition(Vacuum, store.entry);
  await delay(1000); // Simulate the time to move to the next store
  cleanedStoresCount += 0.5;
};

const checkForThrashInStore = (store) => {
  return thrashes[store.name].length > 0;
};

const isStoreOccupied = (store) => {
  return store.occupied;
};

const goToChargingStation = async (vacuum, lastPosition) => {
  // debugger;
  // console.log("Yendo a la estación de carga...");
  // const reachedChargi = await moveToAPosition(vacuum, chargingStationPosition);
  // await moveToAPosition(vacuum, chargingStationPosition);
  // console.log("Cargando batería...");
  // await delay(5000); // Simular el tiempo de carga
  // battery = 100;
  // console.log("Batería cargada al 100%");
  // let reached = false;
  // while (!reached) {
  //   reached = await moveToAPosition(vacuum, lastPosition);
  //   console.log("Regresando a la última posición...");
  // }
  // isGoingToCharge = false;
};

const updatedStores = [up_store, right_store, left_store, down_store];

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function cleanPendingStores(pendingStores) {
  if (pendingStores.length > 0) {
    if (pendingIndex < pendingStores.length && !isWaiting && !isCleaning) {
      const store = pendingStores[pendingIndex];
      const reached = await moveToAPosition(Vacuum, store.entry);
      if (reached) {
        // console.log("Llegó a la entrada de la tienda");

        // console.log("Escaneando tienda...");
        isWaiting = true;
        await delay(2000);
        // console.log("¡Tienda escaneada!");
        isWaiting = false;
        let thrashesInStore = checkForThrashInStore(store);
        if (thrashesInStore) {
          // console.log("Hay basura en la bodega");
          // console.log("Limpiando la bodega...");
          pendingIndex++;
          await cleanStoreZigzag(store);
          // console.log("¡Bodega limpia!");
          clean.push(store);
        } else {
          // console.log("No hay basura en la bodega");
          // console.log("¡Bodega limpia!");
          clean.push(store);
          pendingIndex++;
        }
      }
    }
  } else {
    allStoresCleaned = true;
    // console.log("¡Todas las bodegas han sido limpiadas!");
    return;
  }
}

async function moveToStoreAndClean() {
  if (currentIndex === updatedStores.length) {
    await cleanPendingStores(pendingCleaning);
  }

  if (currentIndex < updatedStores.length && !isWaiting && !isCleaning) {
    const currentStore = updatedStores[currentIndex];
    const reached = await moveToAPosition(Vacuum, currentStore.entry); // Moverse a la entrada de una bodega

    if (reached) {
      // console.log("Llegó a la entrada de la tienda");
      if (currentIndex !== 0) {
        let lastStore = updatedStores[currentIndex - 1];
        let lastStoreIsOccupied = isStoreOccupied(lastStore);
        if (lastStoreIsOccupied) {
          // console.log(
          //   "La Bodega anterior estaba ocupada, cambiando estado a no ocupada"
          // );
          lastStore.occupied = false;
          updateLightColors();
        }
      }

      // console.log("Escaneando tienda...");
      isWaiting = true;
      await delay(2000);
      // console.log("¡Tienda escaneada!");
      isWaiting = false;

      let actualStoreIsOccupied = isStoreOccupied(currentStore);
      if (actualStoreIsOccupied && currentIndex === stores.length - 1) {
        // console.log(
        //   "La ultima bodega está ocupada, esperando a que se desocupe"
        // );
        isWaiting = true;
        await delay(2000);
        // console.log("¡Bodega desocupada!");
        isWaiting = false;
        currentStore.occupied = false;
        actualStoreIsOccupied = isStoreOccupied(currentStore);
        updateLightColors();
      }

      if (actualStoreIsOccupied) {
        // console.log("La Bodega está ocupada");
        pendingCleaning.push(currentStore);
        currentIndex++;
      } else if (actualStoreIsOccupied === false) {
        let thrashesInStore = checkForThrashInStore(currentStore);
        if (thrashesInStore) {
          // console.log("Hay basura en la bodega");
          // console.log("Limpiando la bodega...");
          currentIndex++;
          await cleanStoreZigzag(currentStore);
          // console.log("¡Bodega limpia!");
          clean.push(currentStore);
        } else {
          // console.log("No hay basura en la bodega");
          // console.log("¡Bodega limpia!");
          clean.push(currentStore);
          currentIndex++;
        }
      }
    }
  }
}

async function animate() {
  requestAnimationFrame(animate);
  updateLightColors();

  if (!allStoresCleaned) {
    await moveToStoreAndClean();

    Vacuum.update({
      center_ground: center_ground,
      up_store: up_store,
      right_store: right_store,
      left_store: left_store,
      down_store: down_store,
    });
    thrashes["total_thrashes"].forEach((thrash) => {
      aspirarBasura(Vacuum, thrash, thrashes["total_thrashes"]);
    });
  }

  renderer.render(scene, camera);
}

animate();
