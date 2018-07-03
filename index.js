const FPS = 30;
const SHIP_SIZE = 30;
const TURN_SPEED = 360; // deg per second
const SHIP_THRUST = 5; // acceleration of the ship in pixels per sec per sec
const FRICTION = 0.7; // firction coeeficient of space. (0 = no firction, 1 = full friction)
const ASTEROIDS_NUM = 3;
const ASTEROIDS_SIZE = 100; // size in pixel
const ASTEROIDS_SPEED = 50; // max starting speed in pixels per sec
const ASTEROIDS_VERT = 10; // avg num of vertices
const ASTEROID_JAG = 0.3;
const SHOW_CENTER_DOT = false;
const SHOW_BOUNDING = false;
const SHIP_EXPLODE_DURATION = 0.3;
const SHIP_INVINCIBLE_DURATION = 3;
const SHIP_BLINK_DURATION = 0.1;
const LASER_MAX = 10;
const LASER_SPEED = 500; // pixels per second
const LASER_DIST = 0.6; // fraction of screen width
const LASER_EXPLODE_DURATION = 0.1;
const TEXT_FADE_TIME = 2.5;
const TEXT_SIZE = 40; // in pixels
const GAME_LIVES = 3;
const ROID_POINTS_LARGE = 20;
const ROID_POINTS_MEDIUM = 50;
const ROID_POINTS_SMALL = 100;
const SAVE_KEY_SCORE = "HIGH_SCORE";
const SOUND_ON = true;
const MUSIC_ON = true;

function Sound(src, maxStreams = 1, volume = 1.0) {
  this.streamNum = 0;
  this.streams = [];
  for (let i = 0; i < maxStreams; i++) {
    this.streams.push(new Audio(src));
    this.streams[i].volume = volume;
  }
  this.play = () => {
    if (SOUND_ON) {
      this.streamNum = (this.streamNum + 1) % maxStreams;
      console.log("playing for ", this.streamNum);
      this.streams[this.streamNum].play();
    }
  };
  this.stop = () => {
    for (let i = 0; i < this.streams.length; i++) {
      this.streams[i].pause();
      this.streams[i].currentTime = 0;
    }
  };
}

function Music(srcLow, srcHigh) {
  this.soundLow = new Audio(srcLow);
  this.soundHigh = new Audio(srcHigh);
  this.low = true;
  this.tempo = 1.0; // seconds per beat
  this.beatTime = 0; // frames left till next beat
  this.play = () => {
    if (MUSIC_ON) {
      if (this.low) this.soundLow.play();
      else this.soundHigh.play();
      this.low = !this.low;
    }
  };

  this.tick = () => {
    if (this.beatTime === 0) {
      this.play();
      this.beatTime = Math.ceil(this.tempo * FPS);
    } else {
      this.beatTime--;
    }
  };

  this.setAsteroidRatio = ratio => {
    this.tempo = 1.0 - 0.75 * (1.0 - ratio);
  };
}

/** @type {HTMLCanvasElement} */
let canvas = document.getElementById("gameCanvas");
let ctx = canvas.getContext("2d");

// set up sound effects
let fxLaser = new Sound("./sounds/laser.m4a", 5, 0.5);
let fxExplode = new Sound("./sounds/explode.m4a");
let fxHit = new Sound("./sounds/hit.m4a", 5);
let fxThrust = new Sound("./sounds/thrust.m4a", 5);

// set up music
let music = new Music("sounds/music-low.m4a", "sounds/music-high.m4a");
let asteroidsLeft, asteroidsTotal;

function createAsteroidBelt() {
  asteroids = [];
  asteroidsTotal = (ASTEROIDS_NUM + level) * 7;
  asteroidsLeft = (ASTEROIDS_NUM + level) * 7;
  let x, y;
  for (let i = 0; i < ASTEROIDS_NUM + level; i++) {
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

function gameOver() {
  ship.dead = true;
  text = "GAME OVER";
  textAlpha = 1.0;
}

function newLevel() {
  text = `Level ${level + 1}`;
  textAlpha = 1.0;
  createAsteroidBelt();
}

function newGame() {
  level = 0;
  score = 0;
  ship = newShip();
  newLevel();
  // get high score
  let scoreStr = localStorage.getItem(SAVE_KEY_SCORE);
  if (scoreStr === null) {
    scoreHigh = 0;
  } else {
    scoreHigh = parseInt(scoreStr);
  }
  lives = GAME_LIVES;
}

function newShip() {
  return {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: SHIP_SIZE / 2,
    angle: (90 / 180) * Math.PI, // 90 deg -> up, converting to rad
    rotation: 0,
    thrusting: false,
    thrust: {
      x: 0,
      y: 0
    },
    explodeTime: 0,
    blinkTime: Math.ceil(SHIP_BLINK_DURATION * FPS),
    blinkNum: Math.ceil(SHIP_INVINCIBLE_DURATION / SHIP_BLINK_DURATION),
    canShoot: true,
    lasers: [],
    dead: false
  };
}

// set up game parameters

let level, asteroids, ship, text, textAlpha, lives, score, scoreHigh;
newGame();

function drawShip(x, y, angle, color = "white") {
  ctx.strokeStyle = color;
  ctx.lineWidth = SHIP_SIZE / 20;
  ctx.beginPath();
  ctx.moveTo(
    // nose
    x + (4 / 3) * ship.radius * Math.cos(angle), // cosine represents horizontal
    y - (4 / 3) * ship.radius * Math.sin(angle) // sine represents vertical
  );
  ctx.lineTo(
    // rear left
    x - ship.radius * ((2 / 3) * Math.cos(angle) + Math.sin(angle)),
    y + ship.radius * ((2 / 3) * Math.sin(angle) - Math.cos(angle))
  );
  ctx.lineTo(
    // rear right
    x - ship.radius * ((2 / 3) * Math.cos(angle) - Math.sin(angle)),
    y + ship.radius * ((2 / 3) * Math.sin(angle) + Math.cos(angle))
  );
  ctx.closePath();
  ctx.stroke();

  if (SHOW_BOUNDING) {
    ctx.strokeStyle = "lime";
    ctx.beginPath();
    ctx.arc(x, y, ship.radius, 0, Math.PI * 2, false);
    ctx.stroke();
  }
}

function shootLaser() {
  // cerate laser
  if (ship.canShoot && ship.lasers.length < LASER_MAX) {
    ship.lasers.push({
      // shoot from nose
      x: ship.x + (4 / 3) * ship.radius * Math.cos(ship.angle),
      y: ship.y - (4 / 3) * ship.radius * Math.sin(ship.angle),
      xVelocity: (LASER_SPEED * Math.cos(ship.angle)) / FPS,
      yVelocity: (-LASER_SPEED * Math.sin(ship.angle)) / FPS,
      distTravelled: 0,
      explodeTime: 0
    });
    fxLaser.play();
  }
  // prevent shooting
  ship.canShoot = false;
}

function explodeShip() {
  // ctx.fillStyle = "lime";
  // ctx.strokeStyle = "lime";
  // ctx.beginPath();
  // ctx.arc(ship.x, ship.y, ship.radius, 0, Math.PI * 2, false);
  // ctx.fill();
  // ctx.stroke();
  ship.explodeTime = Math.ceil(SHIP_EXPLODE_DURATION * FPS);
  fxExplode.play();
}

function update() {
  var blinkOn = ship.blinkNum % 2 === 0;
  let exploding = ship.explodeTime > 0;

  // tick music
  music.tick();

  // space
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // thrust
  if (ship.thrusting && !ship.dead) {
    ship.thrust.x += (SHIP_THRUST * Math.cos(ship.angle)) / FPS;
    ship.thrust.y -= (SHIP_THRUST * Math.sin(ship.angle)) / FPS;
    fxThrust.play();
    if (!exploding && blinkOn) {
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
    }
  } else {
    ship.thrust.x -= (FRICTION * ship.thrust.x) / FPS;
    ship.thrust.y -= (FRICTION * ship.thrust.y) / FPS;
    fxThrust.stop();
  }

  // ship
  if (!exploding) {
    if (blinkOn && !ship.dead) {
      drawShip(ship.x, ship.y, ship.angle);
    }
    if (ship.blinkNum > 0) {
      // reduce blink time and num
      ship.blinkTime--;
      if (ship.blinkTime === 0) {
        ship.blinkTime = Math.ceil(SHIP_BLINK_DURATION * FPS);
        ship.blinkNum--;
      }
    }
  } else {
    // explosion
    ctx.fillStyle = "darkred";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.radius * 1.7, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.radius * 1.4, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.fillStyle = "orange";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.radius * 1.1, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.fillStyle = "yellow";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.radius * 0.8, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.radius * 0.5, 0, Math.PI * 2, false);
    ctx.fill();
  }

  // asteroids
  ctx.lineWidth = SHIP_SIZE / 20;
  asteroids.forEach(
    ({ x, y, radius, angle, vert, offsets, xVelocity, yVelocity }, i) => {
      ctx.strokeStyle = "slategrey";

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

      if (SHOW_BOUNDING) {
        ctx.strokeStyle = "lime";
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2, false);
        ctx.stroke();
      }
    }
  );

  // center dot
  if (SHOW_CENTER_DOT) {
    ctx.fillStyle = "red";
    ctx.fillRect(ship.x - 1, ship.y - 1, 2, 2);
  }

  // draw laser
  ship.lasers.forEach(({ x, y, explodeTime }) => {
    if (explodeTime === 0) {
      ctx.fillStyle = "salmon";
      ctx.beginPath();
      ctx.arc(x, y, SHIP_SIZE / 15, 0, Math.PI * 2, false);
      ctx.fill();
    } else {
      ctx.fillStyle = "orangered";
      ctx.beginPath();
      ctx.arc(x, y, ship.radius * 0.75, 0, Math.PI * 2, false);
      ctx.fill();
      ctx.fillStyle = "salmon";
      ctx.beginPath();
      ctx.arc(x, y, ship.radius * 0.5, 0, Math.PI * 2, false);
      ctx.fill();
      ctx.fillStyle = "pink";
      ctx.beginPath();
      ctx.arc(x, y, ship.radius * 0.25, 0, Math.PI * 2, false);
      ctx.fill();
    }
  });

  // draw game text
  if (textAlpha >= 0) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = `rgba(255, 255, 255, ${textAlpha})`;
    ctx.font = `small-caps ${TEXT_SIZE}px dejavu sans mono`;
    ctx.fillText(text, canvas.width / 2, canvas.height * 0.75);
    textAlpha -= 1.0 / TEXT_FADE_TIME / FPS;
  } else if (ship.dead) {
    newGame();
  }

  // draw lives
  let lifeColor;
  for (let i = 0; i < lives; i++) {
    lifeColor = exploding && i === lives - 1 ? "red" : "white";
    drawShip(
      SHIP_SIZE + i * SHIP_SIZE * 1.2,
      SHIP_SIZE,
      0.5 * Math.PI,
      lifeColor
    );
  }

  // draw score
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "white";
  ctx.font = `${TEXT_SIZE}px dejavu sans mono`;
  ctx.fillText(`Score: ${score}`, canvas.width - SHIP_SIZE / 2, SHIP_SIZE);

  // draw high score

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "white";
  ctx.font = `${TEXT_SIZE * 0.75}px dejavu sans mono`;
  ctx.fillText(`High Score: ${scoreHigh}`, canvas.width / 2, SHIP_SIZE);

  // detect laser hitting asteroid

  for (let i = asteroids.length - 1; i >= 0; i--) {
    let { x, y, radius } = asteroids[i];
    for (let j = ship.lasers.length - 1; j >= 0; j--) {
      let { x: lx, y: ly, explodeTime } = ship.lasers[j];

      // detect hit
      if (explodeTime === 0 && distBetweenPoints(x, y, lx, ly) < radius) {
        // remove asteroid and activate explosion
        destroyAsteroid(i);
        ship.lasers[j].explodeTime = Math.ceil(LASER_EXPLODE_DURATION * FPS);
        break;
      }
    }
  }

  if (!exploding) {
    // rotate
    ship.angle += ship.rotation;

    // check for collisions
    if (ship.blinkNum === 0 && !ship.dead) {
      asteroids.forEach(({ x, y, radius }, i) => {
        if (distBetweenPoints(ship.x, ship.y, x, y) < ship.radius + radius) {
          explodeShip();
          destroyAsteroid(i);
        }
      });
    }

    // move ship
    ship.x += ship.thrust.x;
    ship.y += ship.thrust.y;
  } else {
    ship.explodeTime--;
    if (ship.explodeTime == 0) {
      lives--;
      if (lives === 0) {
        gameOver();
      } else {
        ship = newShip();
      }
    }
  }

  // handle edge (ship)
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

  // move laser

  for (let i = ship.lasers.length - 1; i >= 0; i--) {
    // check distance travelled
    if (ship.lasers[i].distTravelled > LASER_DIST * canvas.width) {
      ship.lasers.splice(i, 1);
      continue;
    }

    // handle explosion
    if (ship.lasers[i].explodeTime > 0) {
      ship.lasers[i].explodeTime--;
      if (ship.lasers[i].explodeTime === 0) {
        ship.lasers.splice(i, 1);
        continue;
      }
    } else {
      ship.lasers[i].x += ship.lasers[i].xVelocity;
      ship.lasers[i].y += ship.lasers[i].yVelocity;

      // calculate the distance
      ship.lasers[i].distTravelled += Math.sqrt(
        Math.pow(ship.lasers[i].xVelocity, 2) +
          Math.pow(ship.lasers[i].yVelocity, 2)
      );

      // handle edge

      if (ship.lasers[i].x < 0) {
        ship.lasers[i].x = canvas.width;
      } else if (ship.lasers[i].x > canvas.width) {
        ship.lasers[i].x = 0;
      }

      if (ship.lasers[i].y < 0) {
        ship.lasers[i].y = canvas.height;
      } else if (ship.lasers[i].y > canvas.height) {
        ship.lasers[i].y = 0;
      }
    }
  }

  // move asteroid
  asteroids.forEach(({ radius, xVelocity, yVelocity }, i) => {
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
  });
}

function keyDown(/** @type {KeyboardEvent} */ ev) {
  if (ship.dead) {
    return;
  }
  switch (ev.keyCode) {
    case 32: // shoot laser (space)
      shootLaser();
      break;
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
  if (ship.dead) {
    return;
  }
  switch (ev.keyCode) {
    case 32: // shoot laser (space)
      ship.canShoot = true;
      break;
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

function destroyAsteroid(i) {
  let { x, y, radius } = asteroids[i];

  // split the asteroid in two if necessary
  if (radius == Math.ceil(ASTEROIDS_SIZE / 2)) {
    asteroids.push(newAesteroid(x, y, Math.ceil(ASTEROIDS_SIZE / 4)));
    asteroids.push(newAesteroid(x, y, Math.ceil(ASTEROIDS_SIZE / 4)));
    score += ROID_POINTS_LARGE;
  } else if (radius == Math.ceil(ASTEROIDS_SIZE / 4)) {
    asteroids.push(newAesteroid(x, y, Math.ceil(ASTEROIDS_SIZE / 8)));
    asteroids.push(newAesteroid(x, y, Math.ceil(ASTEROIDS_SIZE / 8)));
    score += ROID_POINTS_MEDIUM;
  } else {
    score += ROID_POINTS_SMALL;
  }

  // check high score
  if (score > scoreHigh) {
    scoreHigh = score;
    localStorage.setItem(SAVE_KEY_SCORE, scoreHigh);
  }

  asteroids.splice(i, 1);
  fxHit.play();

  // calculate remaining asteroids

  asteroidsLeft--;
  music.setAsteroidRatio(
    asteroidsLeft === 0 ? 1 : asteroidsLeft / asteroidsTotal
  );

  // new level when no asteroid
  if (asteroids.length === 0) {
    level++;
    newLevel();
  }
}

function newAesteroid(x, y, r) {
  let levelMultiplier = 1 + 0.1 * level;
  let aesteroid = {
    x: x,
    y: y,
    xVelocity:
      ((Math.random() * ASTEROIDS_SPEED * levelMultiplier) / FPS) *
      (Math.random() < 0.5 ? 1 : -1),
    yVelocity:
      ((Math.random() * ASTEROIDS_SPEED * levelMultiplier) / FPS) *
      (Math.random() < 0.5 ? 1 : -1),
    radius: r || Math.ceil(ASTEROIDS_SIZE / 2),
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

document.addEventListener("keydown", keyDown);
document.addEventListener("keyup", keyUp);

setInterval(update, 1000 / FPS);
