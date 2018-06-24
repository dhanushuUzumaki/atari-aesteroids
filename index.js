const FPS = 30;
const SHIP_SIZE = 30;
const TURN_SPEED = 360; // deg per second
const SHIP_THRUST = 5; // acceleration of the ship in pixels per sec per sec
const FRICTION = 0.7; // firction coeeficient of space. (0 = no firction, 1 = full friction)
const ASTEROIDS_NUM = 10;
const ASTEROIDS_SIZE = 100; // size in pixel
const ASTEROIDS_SPEED = 50; // max starting speed in pixels per sec
const ASTEROIDS_VERT = 10; // avg num of vertices
const ASTEROID_JAG = 0.3;

/** @type {HTMLCanvasElement} */
let canvas = document.getElementById("gameCanvas");
let ctx = canvas.getContext("2d");

let ship = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: SHIP_SIZE / 2,
  angle: (90 / 180) * Math.PI, // 90 deg -> up, converting to rad
  rotation: 0,
  thrusting: false,
  thrust: {
    x: 0,
    y: 0
  }
};

let asteroids = [];

function update() {
  // space
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // thrust
  if (ship.thrusting) {
    ship.thrust.x += (SHIP_THRUST * Math.cos(ship.angle)) / FPS;
    ship.thrust.y -= (SHIP_THRUST * Math.sin(ship.angle)) / FPS;

    // draw thruster
    ctx.strokeStyle = "yellow";
    ctx.fillStyle = "red";
    ctx.lineWidth = SHIP_SIZE / 10;
    ctx.beginPath();
    ctx.moveTo(
      // rear left
      ship.x -
        ship.radius *
          ((2 / 3) * Math.cos(ship.angle) + 0.5 * Math.sin(ship.angle)),
      ship.y +
        ship.radius *
          ((2 / 3) * Math.sin(ship.angle) - 0.5 * Math.cos(ship.angle))
    );
    ctx.lineTo(
      // rear center - behind the ship
      ship.x - ship.radius * ((6 / 3) * Math.cos(ship.angle)),
      ship.y + ship.radius * ((6 / 3) * Math.sin(ship.angle))
    );
    ctx.lineTo(
      // rear right
      ship.x -
        ship.radius *
          ((2 / 3) * Math.cos(ship.angle) - 0.5 * Math.sin(ship.angle)),
      ship.y +
        ship.radius *
          ((2 / 3) * Math.sin(ship.angle) + 0.5 * Math.cos(ship.angle))
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ship.thrust.x -= (FRICTION * ship.thrust.x) / FPS;
    ship.thrust.y -= (FRICTION * ship.thrust.y) / FPS;
  }

  // ship
  ctx.strokeStyle = "white";
  ctx.lineWidth = SHIP_SIZE / 20;
  ctx.beginPath();
  ctx.moveTo(
    // nose
    ship.x + (4 / 3) * ship.radius * Math.cos(ship.angle), // cosine represents horizontal
    ship.y - (4 / 3) * ship.radius * Math.sin(ship.angle) // sine represents vertical
  );
  ctx.lineTo(
    // rear left
    ship.x -
      ship.radius * ((2 / 3) * Math.cos(ship.angle) + Math.sin(ship.angle)),
    ship.y +
      ship.radius * ((2 / 3) * Math.sin(ship.angle) - Math.cos(ship.angle))
  );
  ctx.lineTo(
    // rear right
    ship.x -
      ship.radius * ((2 / 3) * Math.cos(ship.angle) - Math.sin(ship.angle)),
    ship.y +
      ship.radius * ((2 / 3) * Math.sin(ship.angle) + Math.cos(ship.angle))
  );
  ctx.closePath();
  ctx.stroke();

  // asteroids
  ctx.strokeStyle = "slategrey";
  ctx.lineWidth = SHIP_SIZE / 20;
  asteroids.forEach(
    ({ x, y, radius, angle, vert, offsets, xVelocity, yVelocity }, i) => {
      // PATH
      ctx.beginPath();
      ctx.moveTo(
        x + radius * offsets[0] * Math.cos(angle),
        y + radius * offsets[0] * Math.sin(angle)
      );
      // POLYGON
      for (let j = 1; j < vert; j++) {
        ctx.lineTo(
          x + radius * offsets[j] * Math.cos(angle + (j * Math.PI * 2) / vert),
          y + radius * offsets[j] * Math.sin(angle + (j * Math.PI * 2) / vert)
        );
      }
      ctx.closePath();
      ctx.stroke();
      // MOVE AESTEROID
      asteroids[i].x += xVelocity;
      asteroids[i].y += yVelocity;
      // HANDLE EDGE
      let leftCorner = 0 - radius;
      let rightCorner = canvas.width + radius;
      let topCorner = 0 - radius;
      let bottomCorner = canvas.height + radius;

      if (asteroids[i].x < leftCorner) {
        asteroids[i].x = rightCorner;
      } else if (asteroids[i].x > rightCorner) {
        asteroids[i].x = leftCorner;
      }

      if (asteroids[i].y < topCorner) {
        asteroids[i].y = bottomCorner;
      } else if (asteroids[i].y > bottomCorner) {
        asteroids[i].y = topCorner;
      }
    }
  );

  // rotate
  ship.angle += ship.rotation;

  // move
  ship.x += ship.thrust.x;
  ship.y += ship.thrust.y;

  // handle edge
  let LEFT_CORNER = 0 - ship.radius;
  let RIGHT_CORNER = canvas.width + ship.radius;
  let TOP_CORNER = 0 - ship.radius;
  let BOTTOM_CORNER = canvas.height + ship.radius;
  if (ship.x < LEFT_CORNER) {
    ship.x = RIGHT_CORNER;
  } else if (ship.x > RIGHT_CORNER) {
    ship.x = LEFT_CORNER;
  }

  if (ship.y < TOP_CORNER) {
    ship.y = BOTTOM_CORNER;
  } else if (ship.y > BOTTOM_CORNER) {
    ship.y = TOP_CORNER;
  }

  // center dot
  // ctx.fillStyle = "red";
  // ctx.fillRect(ship.x - 1, ship.y - 1, 2, 2);
}

function keyDown(/** @type {KeyboardEvent} */ ev) {
  switch (ev.keyCode) {
    case 37: // left (rotate left)
      ship.rotation = ((TURN_SPEED / 180) * Math.PI) / FPS;
      break;
    case 38: // up (thrust forward)
      ship.thrusting = true;
      break;
    case 39: // right (rotate right)
      ship.rotation = ((-TURN_SPEED / 180) * Math.PI) / FPS;
      break;
  }
}

function keyUp(/** @type {KeyboardEvent} */ ev) {
  switch (ev.keyCode) {
    case 37: // left (stop rotate left)
      ship.rotation = 0;
      break;
    case 38: // up (stop thrust forward)
      ship.thrusting = false;
      break;
    case 39: // right (stop rotate right)
      ship.rotation = 0;
      break;
  }
}

function newAesteroid(x, y) {
  let aesteroid = {
    x: x,
    y: y,
    xVelocity:
      ((Math.random() * ASTEROIDS_SPEED) / FPS) *
      (Math.random() < 0.5 ? 1 : -1),
    yVelocity:
      ((Math.random() * ASTEROIDS_SPEED) / FPS) *
      (Math.random() < 0.5 ? 1 : -1),
    radius: ASTEROIDS_SIZE / 2,
    angle: Math.random() * Math.PI * 2, // in rad
    vert: Math.floor(Math.random() * (ASTEROIDS_VERT + 1) + ASTEROIDS_VERT / 2),
    offsets: []
  };

  for (let i = 0; i < aesteroid.vert; i++) {
    aesteroid.offsets.push(Math.random() * ASTEROID_JAG * 2 + 1 - ASTEROID_JAG);
  }

  return aesteroid;
}

function distBetweenPoints(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function createAsteroidBelt() {
  asteroids = [];
  let x, y;
  for (let i = 0; i < ASTEROIDS_NUM; i++) {
    do {
      x = Math.floor(Math.random() * canvas.width);
      y = Math.floor(Math.random() * canvas.height);
    } while (
      distBetweenPoints(ship.x, ship.y, x, y) <
      ASTEROIDS_SIZE * 2 + ship.radius
    );
    asteroids.push(newAesteroid(x, y));
  }
}

document.addEventListener("keydown", keyDown);
document.addEventListener("keyup", keyUp);

createAsteroidBelt();
setInterval(update, 1000 / FPS);
