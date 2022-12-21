'use strict';
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passportSocketIo = require('passport.socketio');
const connectMongo = require('connect-mongo');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo')(session);
const passport = require('passport');

const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const routes = require('./routes');
const auth = require('./auth');

const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });

const app = express();

const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.set('view engine', 'pug');
app.set('views', './views/pug');

app.use(session({
  secret: process.env.SESSION_SECRET,
  key: 'express.sid',
  store,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false },
}));

io.use(passportSocketIo.authorize({
  cookieParser: cookieParser,
  key: 'express.sid',
  secret: process.env.SESSION_SECRET,
  store,
  success: onAuthorizeSuccess,
  fail: onAuthorizeFail,
}));


myDB(async (client) => {
  const myDataBase = await client.db('database').collection('users');
  auth(app, myDataBase);
  routes(app, myDataBase);

  let currentUsers = 0;
  io.on('connection', (socket) => {
    console.log(`User ${socket.request.user.username} has connected`);
    ++currentUsers;
  
    io.emit('user', {
      username: socket.request.user.username,
      currentUsers,
      connected: true,
    });
  
    socket.on('chat message', (message) => {
      io.emit('chat message', {
        message,
        username: socket.request.user.username,
      });
    });
  
    socket.on('disconnect', () => {
      console.log('A user has disconnect');
      --currentUsers;
        io.emit('user', {
          username: socket.request.user.username,
          currentUsers,
          connected: false,
        });
      });
  
  });

}).catch((e) => {
  app.route('/').get((req, res) => {
    res.render('index', {title: e, message: 'Unable to connect to database'});
  });
});

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const PORT = process.env.PORT || 3000;

http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});

function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');

  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) {
    throw new Error(message);
  }

  console.log(`falied connection to socket.io: ${message}`);
  accept(null, false);
}
