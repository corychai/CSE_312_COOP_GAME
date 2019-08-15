const express = require('express');
const exphbs = require('express-handlebars');
const app = express();
const port = 3000;

const bodyParser = require('body-parser');

app.use(express.static(__dirname + '/public'));

app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

const mysql = require('mysql');
let sql = "";
/*
MySQL Node.js Tutorials:
    https://www.w3schools.com/nodejs/nodejs_mysql_create_table.asp
    http://www.mysqltutorial.org/mysql-nodejs/
*/

const bcrypt = require('bcrypt');
const saltRounds = 10;

const config = require('./config');
const con = mysql.createConnection(config.dbConn);

var user = "";

//TODO: Remove Test Statements

//   ------ Authentication ------   //

sql = 'USE ' + config.dbConn.database;
con.query(sql, function (err) {
    if (err) throw err;
    //TODO: --Test Statement START--
    sql = "DROP TABLE IF EXISTS users";
    con.query(sql, function (err, result) {
        if (err) throw err;
        console.log("Table reset");
    });
    //TODO: --Test Statement END--
    sql = `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARBINARY(255),
        password VARCHAR(255),
        kills INT,
        deaths INT
    )`;
    con.query(sql, function (err, result) {
        if (err) throw err;
        console.log("Table created");
    });
    //TODO: --Test Statement START--
    con.query("SELECT * FROM users", function (err, result, fields) {
        if (err) throw err;
        console.log(result);
    });
    //TODO: --Test Statement END--
});

app.get('/', function(req, res) {
    //TODO: --Test Statement START--
    con.query("SELECT * FROM users", function (err, result, fields) {
        if (err) throw err;
        console.log(result);
    });
    //TODO: --Test Statement END--
    res.render('signIn');
});
app.get('/register', function(req, res) {
    res.render('register');
});
app.post('/signedIn', function(req, res) {
    sql = "SELECT * FROM users WHERE username = ?"
    let value = req.body.username;
    user = value;
    con.query(sql, value, function (err, result) {
        if (err) throw err;
        if(result.length > 0) {
            if(bcrypt.compareSync(req.body.password, result[0].password)) {
                res.render('index', {"username": result[0].username, "kills": result[0].kills, "deaths": result[0].deaths});
            }
            else {
                res.render('signIn', {"error": "ERROR: Username/Password combination does not exist"});
            }
        }
        else {
            res.render('signIn', {"error": "ERROR: Username/Password combination does not exist"});
        }
    });
});
app.post('/registered', function(req, res) {
    sql = "SELECT * FROM users WHERE username = ?"
    let value = req.body.username;
    user = value;
    con.query(sql, value, function (err, result) {
        if (err) throw err;
        if(result.length > 0) {
            res.render('register', {"error": "ERROR: Username already exists"});
        }
        else {
            const hashPass = bcrypt.hashSync(req.body.password, saltRounds);
            sql = "INSERT INTO users (username, password, kills, deaths) VALUES (?,?,?,?)";
            values = [req.body.username, hashPass, 0, 0];
            con.query(sql, values, function (err, result) {
                if (err) throw err;
                console.log("1 record inserted, ID: " + result.insertId);
            });
            res.render('index', {"username": req.body.username, "kills": 0, "deaths": 0});
        }
    });
});

//   ------ Game ------   //

const server = require('http').Server(app);
var io = require('socket.io').listen(server);

var players = {};
var star = {
  x: Math.floor(Math.random() * config.phaser.width) + 50,
  y: Math.floor(Math.random() * config.phaser.height) + 50
};
var scores = {
  blue: 0,
  red: 0
};

io.on('connection', function(socket) {
    console.log('a user connected');
    // create a new player and add it to our players object
    players[socket.id] = {
      rotation: 0,
      x: Math.floor(Math.random() * config.phaser.width) + 50,
      y: Math.floor(Math.random() * config.phaser.height) + 50,
      playerId: socket.id,
      team: (Math.floor(Math.random() * 2) == 0) ? 'red' : 'blue',
      username: user
    };
    // send the players object to the new player
    socket.emit('currentPlayers', players);
  
    // send the star object to the new player
    socket.emit('starLocation', star);
    // send the current scores
    socket.emit('scoreUpdate', scores);
    // update all other players of the new player
    socket.broadcast.emit('newPlayer', [players, players[socket.id]]);
  
    // when a player disconnects, remove them from our players object
    socket.on('disconnect', function() {
      console.log('user disconnected');
      // remove this player from our players object
      delete players[socket.id];
      // emit a message to all players to remove this player
      io.emit('disconnect', [players, socket.id]);
    });
  
    // when a player moves, update the player data
    socket.on('playerMovement', function(movementData) {
        players[socket.id].x = movementData.x;
        players[socket.id].y = movementData.y;
        players[socket.id].rotation = movementData.rotation;
        // emit a message to all players about the player that moved
        socket.broadcast.emit('playerMoved', players[socket.id]);
    });
    socket.on('starCollected', function() {
        if (players[socket.id].team === 'red') {
            scores.red += 10;
        }
        else {
            scores.blue += 10;
        }
        star.x = Math.floor(Math.random() * config.phaser.width) + 50;
        star.y = Math.floor(Math.random() * config.phaser.height) + 50;
        io.emit('starLocation', star);
        io.emit('scoreUpdate', scores);
    });
});

app.use(function(req, res, next) {
    res.status(404).render('error404');
});
server.listen(process.env.PORT || port, function() {
    console.log(`App ready...`);
});