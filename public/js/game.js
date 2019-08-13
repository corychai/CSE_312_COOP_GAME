var phaser = {
  type: Phaser.AUTO,
  parent: 'phaser-example',
  width: 800,
  height: 600,
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
  this.load.image('bullet','assets/cannon_ball.png');

}
var bullet_array = [];

function create() {
  var self = this;
  this.socket = io();
  this.otherPlayers = this.physics.add.group();
  this.socket.on('currentPlayers', function(players) {
    Object.keys(players).forEach(function(id) {
      if (players[id].playerId === self.socket.id) {
        addPlayer(self, players[id]);
      }
      else {
        addOtherPlayers(self, players[id]);
      }
    });



  });
  this.socket.on('newPlayer', function(playerInfo) {
    addOtherPlayers(self, playerInfo);
  });

  this.socket.on('disconnect', function(playerId) {
    self.otherPlayers.getChildren().forEach(function(otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
  });

  this.cursors = this.input.keyboard.createCursorKeys();
  var spaceBar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

  this.socket.on('playerMoved', function(playerInfo) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerInfo.playerId === otherPlayer.playerId) {
        otherPlayer.setRotation(playerInfo.rotation);
        otherPlayer.setPosition(playerInfo.x, playerInfo.y);
      }
    });
  });

  this.blueScoreText = this.add.text(16, 16, '', { fontSize: '32px', fill: '#0000FF' });
  this.redScoreText = this.add.text(584, 16, '', { fontSize: '32px', fill: '#FF0000' });
    
  this.socket.on('scoreUpdate', function(scores) {
    self.blueScoreText.setText('Blue: ' + scores.blue);
    self.redScoreText.setText('Red: ' + scores.red);
  });

  this.socket.on('starLocation', function(starLocation) {
    if (self.star) self.star.destroy();
    self.star = self.physics.add.image(starLocation.x, starLocation.y, 'star');
    self.physics.add.overlap(self.ship, self.star, function() {
      this.socket.emit('starCollected');
    }, null, self);
  });



  // Listen for bullet update events
  this.socket.on('bullets-update',function(server_bullet_array){
    // If there's not enough bullets on the client, create them
    for(var i=0;i<server_bullet_array.length;i++){
      if(bullet_array[i] == undefined){
        bullet_array[i] = self.physics.add.image(server_bullet_array[i].x,server_bullet_array[i].y,'bullet');
      } else {
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


  this.socket.on('player-hit',function(id){

   // this.socket.emit('playerMovement');



    console.log('This player id: '+id+"   was shot");
    if(id == self.socket.id){

      //If this is you

      self.ship.alpha = 0;





      // self.socket.emit('playerMovement', { x: self.ship.x, y: self.ship.y, rotation: self.ship.rotation });

    } else {
      // Find the right player
     // other_players[id].alpha = 0;

      self.otherPlayers.getChildren().forEach(function(otherPlayer) {
        if (id === otherPlayer.playerId) {
          //otherPlayer.ship.alpha = 0;
          otherPlayer.alpha = 0;
        }
      });
    }



  });






}
 
function update() {

  //gets player back to visiblity- flash, else player will be invisible after shot by bullet

  this.otherPlayers.getChildren().forEach(function(otherPlayer) {
    if (otherPlayer.alpha <1) {
      otherPlayer.alpha += (1 - otherPlayer.alpha) * 0.16;

    } else{
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

    if(this.cursors.space.isDown && !this.shot){
      var speed_x = Math.cos(this.ship.rotation + Math.PI/2) * 20;
      var speed_y = Math.sin(this.ship.rotation + Math.PI/2) * 20;

      this.socket.emit('bullet-shot',{x:this.ship.x,y:this.ship.y,speed_x:speed_x,speed_y:speed_y});
       this.shot = true;
      //console.log('bullet shot  space bar works!!!!!!');


    }
    if(!this.cursors.space.isDown) this.shot = false;
    // To make player flash when they are hit, set player.spite.alpha = 0
    if(this.ship.alpha < 1){
      this.ship.alpha += (1 - this.ship.alpha) * 0.16;
    } else {
      this.ship.alpha = 1;
    }
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
  const otherPlayer = self.add.image(playerInfo.x, playerInfo.y, 'otherPlayer').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
  if (playerInfo.team === 'blue') {
    otherPlayer.setTint(0x0000ff);
  }
  else {
    otherPlayer.setTint(0xff0000);
  }
  otherPlayer.playerId = playerInfo.playerId;
  self.otherPlayers.add(otherPlayer);
}






