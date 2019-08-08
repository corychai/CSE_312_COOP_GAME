const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');

const mysql = require('mysql');
let sql = "";
/*
MySQL Node.js Tutorials:
    https://www.w3schools.com/nodejs/nodejs_mysql_create_table.asp
    http://www.mysqltutorial.org/mysql-nodejs/
*/

const bcrypt = require('bcrypt');
const saltRounds = 10;

const app = express();
const port = 3000;

const con = mysql.createConnection({
    host: "https://cse312-final-project.herokuapp.com/",
    user: "bc2d0e15f15a1e",
    password: "5bbf374f"
});

//TODO: Remove testing statements
sql = "CREATE DATABASE IF NOT EXISTS cse312";
con.query(sql, function (err, result) {
    if (err) throw err;
    console.log("   Database created");
    sql = 'USE cse312'
    con.query(sql, function (err) {
        if (err) throw err;
        sql = "DROP TABLE IF EXISTS users";
        con.query(sql, function (err, result) {
            if (err) throw err;
            console.log("   Table reset");
        });
        sql = `CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255),
            password VARCHAR(255),
            kills INT,
            deaths INT
        )`;
        con.query(sql, function (err, result) {
            if (err) throw err;
            console.log("   Table created");
        });
        con.query("SELECT * FROM users", function (err, result, fields) {
            if (err) throw err;
            console.log(result);
        });
    });
});

app.use(express.static(__dirname + '/public'));

app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

app.get('/', function(req, res) {
    con.query("SELECT * FROM users", function (err, result, fields) {
        if (err) throw err;
        console.log(result);
    });
    res.render('signIn');
});
app.get('/register', function(req, res) {
    res.render('register');
});
app.post('/signedIn', function(req, res) {
    sql = "SELECT * FROM users WHERE username = ?"
    let value = req.body.username;
    con.query(sql, value, function (err, result) {
        if (err) throw err;
        if(result.length > 0) {
            if(bcrypt.compareSync(req.body.password, result[0].password)) {
                res.render('index', {"username": req.body.username});
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
    con.query(sql, value, function (err, result) {
        if (err) throw err;
        if(result.length > 0) {
            res.render('register', {"error": "ERROR: Username already exists"});
        }
        else {
            const hashPass = bcrypt.hashSync(req.body.password, saltRounds);
            sql = "INSERT INTO users (username, password) VALUES (?,?)";
            value = [req.body.username, hashPass];
            con.query(sql, value, function (err, result) {
                if (err) throw err;
                console.log("   1 record inserted, ID: " + result.insertId);
            });
            res.render('index', {"username": req.body.username});
        }
    });
});



app.use(function(req, res, next) {
    res.status(404).render('error404');
});
app.listen(port, function() {
    console.log(`App listening on port ${port}`);
});