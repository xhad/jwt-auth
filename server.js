var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var morgan = require('morgan');
var mongoose = require('mongoose');
var passwordHash = require('password-hash');
var jwt = require('jsonwebtoken');
var config = require('./config');
var User = require('./app/models/user');
var port = process.env.PORT || 8080;

mongoose.connect(config.database);
app.set('superSecret', config.secret);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(morgan('dev'));

// app routes
app.get('/', function(req, res) {
  res.send('Hello! The API is at localhost');
});

// add a test user
app.get('/setup', function(req, res) {
  // create sample User
  var chad = new User({
    name: 'Chad Lynch',
    password: passwordHash.generate('password'),
    admin: true
  });

  // passwordHash.verify('password', hashedPassword)); // true
  // passwordHash.verify('password123', hashedPassword)); // false

  // save the sample User
  chad.save(function(err) {
    if (err) throw err;

    console.log('User saved to database');
    res.json({ sucess: true });
  });
});

// api routes

var api = express.Router();

api.get('/', function(req, res) {
  res.json({ message: 'This is an API'});
});

api.post('/auth', function(req, res) {
  User.findOne({
    name: req.body.name
  }, function(err, user) {
    if (err) throw err;

    if(!user) {
      res.json({ success: false, message: 'Authentication failed. User not found.'})
    } else if (user) {
      if (!passwordHash.verify(req.body.password, user.password)) {
        res.json({success: false, message: 'Authentication failed. Incorrect password'})
      } else {
        // create a token
        var token = jwt.sign(user, app.get('superSecret'), {
          expiresIn: 1440 // 24 horus
        });

        res.json({
          success: true,
          message: 'Token Created',
          token: token
        });
      }
    }
  });
});

// middleware to verify token
api.use(function(req, res, next) {
  var token = req.body.token || req.query.token || req.headers['x-access-token'];

  if (token) {
    //verify secret and check expiry
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {
      if (err) {
        return res.json({success: false, message: 'Failed to Authenticate token.'});
      } else {
        req.decoded = decoded;
        next();
      }
    });
  } else {
    // if there is no token, send an error
    return res.status(403).send({
      success: false,
      message: 'No token provided.'
    });
  }
});

api.get('/users', function(req, res) {
  User.find({}, function(err, users) {
    res.json(users);
  });
});

app.use('/api', api);

// in postman, add key x-access-token with token as value in header

app.listen(port);
console.log('server started on localhost');
