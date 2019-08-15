var gameWidth = 600;
var gameHeight = 500;

var phaser = {
  type: Phaser.AUTO,
  parent: 'display',
  width: gameWidth,
  height: gameHeight,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  } 
};
var game = new Phaser.Game(phaser);
 
function preload() {
  this.load.image('ship', 'assets/spaceShips_001.png');
  this.load.image('otherPlayer', 'assets/enemyBlack5.png');
  this.load.image('star', 'assets/star_gold.png');
}

function stringifyOnline(online) {
  var temp = [];
  var keys = Object.keys(online);
  keys.forEach(function(key){
      temp.push(online[key]);
  });
  let retVal = "";
  temp.forEach(function(player) {
    retVal += player.username + "<br>";
  });
  return retVal;
}

function create() {
  var self = this;
  this.socket = io();
  this.otherPlayers = this.physics.add.group();
  this.socket.on('currentPlayers', function(players) {
    Object.keys(players).forEach(function(id) {
      if (players[id].playerId === self.socket.id) {
        addPlayer(self, players[id]);
        document.getElementById("online").innerHTML = stringifyOnline(players);
      }
      else {
        addOtherPlayers(self, players[id]);
        document.getElementById("online").innerHTML = stringifyOnline(players);
      }
    });
  });
  this.socket.on('newPlayer', function(data) {
    addOtherPlayers(self, data[1]);
    document.getElementById("online").innerHTML = stringifyOnline(data[0]);
  });
  
  this.socket.on('disconnect', function(data) {
    self.otherPlayers.getChildren().forEach(function(otherPlayer) {
      if (data[1] === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
    document.getElementById("online").innerHTML = stringifyOnline(data[0]);
  });
  
  this.cursors = this.input.keyboard.createCursorKeys();
  this.socket.on('playerMoved', function(playerInfo) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerInfo.playerId === otherPlayer.playerId) {
        otherPlayer.setRotation(playerInfo.rotation);
        otherPlayer.setPosition(playerInfo.x, playerInfo.y);
      }
    });
  });

  this.socket.on('starLocation', function(starLocation) {
    if (self.star) self.star.destroy();
    self.star = self.physics.add.image(starLocation.x, starLocation.y, 'star');
    self.physics.add.overlap(self.ship, self.star, function() {
      this.socket.emit('starCollected');
    }, null, self);
  });
}
 
function update() {
  if (this.ship) {
    if (this.cursors.left.isDown) {
      this.ship.setAngularVelocity(-150);
    }
    else if (this.cursors.right.isDown) {
      this.ship.setAngularVelocity(150);
    }
    else {
      this.ship.setAngularVelocity(0);
    }
  
    if (this.cursors.up.isDown) {
      this.physics.velocityFromRotation(this.ship.rotation + 1.5, 100, this.ship.body.acceleration);
    }
    else {
      this.ship.setAcceleration(0);
    }
    this.physics.world.wrap(this.ship, 5);

    // emit player movement
    var x = this.ship.x;
    var y = this.ship.y;
    var r = this.ship.rotation;
    if (this.ship.oldPosition && (x !== this.ship.oldPosition.x || y !== this.ship.oldPosition.y || r !== this.ship.oldPosition.rotation)) {
      this.socket.emit('playerMovement', { x: this.ship.x, y: this.ship.y, rotation: this.ship.rotation });
    }

    // save old position data
    this.ship.oldPosition = {
      x: this.ship.x,
      y: this.ship.y,
      rotation: this.ship.rotation
    };
  }
}

function addPlayer(self, playerInfo) {
  self.ship = self.physics.add.image(playerInfo.x, playerInfo.y, 'ship').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
  if (playerInfo.team === 'blue') {
    self.ship.setTint(0x0000ff);
  }
  else {
    self.ship.setTint(0xff0000);
  }
  self.ship.setDrag(100);
  self.ship.setAngularDrag(100);
  self.ship.setMaxVelocity(200);
}

function addOtherPlayers(self, playerInfo) {
  const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'otherPlayer').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
  if (playerInfo.team === 'blue') {
    otherPlayer.setTint(0x0000ff);
  }
  else {
    otherPlayer.setTint(0xff0000);
  }
  otherPlayer.playerId = playerInfo.playerId;
  self.otherPlayers.add(otherPlayer);
}