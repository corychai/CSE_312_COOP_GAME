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
  this.load.image('otherPlayer', 'assets/sprite.png');
  this.load.image('bullet','assets/laser.png');
}
var bullet_array = [];

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
      if(players[id].playerId === self.socket.id) {
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

  this.socket.on('updateStats', function(data) {
    document.getElementById("kills").innerHTML = data.kills;
    document.getElementById("deaths").innerHTML = data.deaths;
  });
  
  this.socket.on('disconnect', function(data) {
    self.otherPlayers.getChildren().forEach(function(otherPlayer) {
      if(data[1] === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
    document.getElementById("online").innerHTML = stringifyOnline(data[0]);
  });
  
  this.cursors = this.input.keyboard.createCursorKeys();
  var spaceBar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

  this.socket.on('playerMoved', function(playerInfo) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if(playerInfo.playerId === otherPlayer.playerId) {
        otherPlayer.setRotation(playerInfo.rotation);
        otherPlayer.setPosition(playerInfo.x, playerInfo.y);
      }
    });
  });

  // Listen for bullet update events
  this.socket.on('bullets-update', function(server_bullet_array) {
    // If there's not enough bullets on the client, create them
    for(var i=0;i<server_bullet_array.length;i++) {
      if(bullet_array[i] == undefined){
        bullet_array[i] = self.physics.add.image(server_bullet_array[i].x,server_bullet_array[i].y,'bullet').setOrigin(0.5, 0.5).setDisplaySize(10, 10);;
      }
      else {
        //Otherwise, just update it!
        bullet_array[i].x = server_bullet_array[i].x;
        bullet_array[i].y = server_bullet_array[i].y;
      }
    }
    // Otherwise if there's too many, delete the extra
    for(var i=server_bullet_array.length;i<bullet_array.length;i++){
      bullet_array[i].destroy();
      bullet_array.splice(i,1);
      i--;
    }
  });

  this.socket.on('player-hit', function(id) {
    // this.socket.emit('playerMovement');
    console.log('This player id: '+id+"   was shot");
    if(id == self.socket.id){
      //If this is you
      self.ship.alpha = 0;
      self.ship.destroy();
      // self.socket.emit('playerMovement', { x: self.ship.x, y: self.ship.y, rotation: self.ship.rotation });
    }
    else {
      // Find the right player
      // other_players[id].alpha = 0;
      self.otherPlayers.getChildren().forEach(function(otherPlayer) {
        if(id === otherPlayer.playerId) {
          //otherPlayer.ship.alpha = 0;
          otherPlayer.alpha = 0;
        }
      });
    }
  });

  this.socket.on('update_players_shot', function(players,bullet_id,victim_id) {
    Object.keys(players).forEach(function(id) {
      if(players[id].playerId === self.socket.id) {
        if(self.socket.id === victim_id) {
          addPlayer(self, players[victim_id]);
        }
      }
      else {
        //addOtherPlayers(self, players[id]);
      }
    });
  });

  this.socket.on('updateStats_Victim', function(data,players,victim_id) {
    if (victim_id === self.socket.id) {
        document.getElementById("kills").innerHTML = "Kills: " + data.kills;
        document.getElementById("deaths").innerHTML ="Deaths: "+ data.deaths;
    }
  });
  this.socket.on('updateStats_Killer', function(data,players,killer_id) {
    if ( killer_id=== self.socket.id) {
        document.getElementById("kills").innerHTML = "Kills: " + data.kills;
        document.getElementById("deaths").innerHTML ="Deaths: "+ data.deaths;
    }
  });
}
 
function update() {
  //gets player back to visiblity- flash, else player will be invisible after shot by bullet
  this.otherPlayers.getChildren().forEach(function(otherPlayer) {
    if(otherPlayer.alpha <1) {
      otherPlayer.alpha += (1 - otherPlayer.alpha) * 0.16;
    }
    else {
      otherPlayer.alpha = 1;
    }
  });
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

    //bullet
    if(this.cursors.space.isDown && !this.shot) {
      var speed_x = Math.cos(this.ship.rotation + Math.PI/2) * 20;
      var speed_y = Math.sin(this.ship.rotation + Math.PI/2) * 20;

      this.socket.emit('bullet-shot',{x:this.ship.x,y:this.ship.y,speed_x:speed_x,speed_y:speed_y});
      this.shot = true;
    }
    if(!this.cursors.space.isDown) this.shot = false;
    // To make player flash when they are hit, set player.spite.alpha = 0
    if(this.ship.alpha < 1) {
      this.ship.alpha += (1 - this.ship.alpha) * 0.16;
    }
    else {
      this.ship.alpha = 1;
    }
  }
}

function addPlayer(self, playerInfo) {
  self.ship = self.physics.add.image(playerInfo.x, playerInfo.y, 'ship').setOrigin(0.5, 0.5).setDisplaySize(40, 40);
  self.ship.setTint(playerInfo.color);
  self.ship.setDrag(100);
  self.ship.setAngularDrag(100);
  self.ship.setMaxVelocity(200);
}

function addOtherPlayers(self, playerInfo) {
  const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'otherPlayer').setOrigin(0.5, 0.5).setDisplaySize(40, 40);
  otherPlayer.setTint(playerInfo.color);
  otherPlayer.playerId = playerInfo.playerId;
  self.otherPlayers.add(otherPlayer);
}