let _ = require("lodash");
let mongoose = require("mongoose");
let redis = require("redis");

const roomsChannel = "rooms_channel";
const usersChannel = "users_channel";
const roomListChannel = "roomlist_channel";
let redisClient;
let redisSubscriberClient;

const chatService = {};

// Our username
let myUsername;
let myAvatarUrl;

// Description of message model
const Message = mongoose.model(
  "Message",
  new mongoose.Schema({
    user: String,
    avatarUrl: String,
    date: Date,
    content: String,
    room: String,
  })
);

// Description of room model
const Room = mongoose.model(
  "Room",
  new mongoose.Schema({
    name: String,
  })
);

// Function called when connecting
chatService.connect = function (
  username,
  avatarUrl,
  serverAddress,
  password,
  successCb,
  failCb,
  messageCallback,
  userCallback,
  roomCallback
) {
  myUsername = username;
  myAvatarUrl = avatarUrl;
  let dbReady = false;
  let mqReady = false;

  let db = mongoose.connect(
    "mongodb://bilabor:" +
      password +
      "@" +
      serverAddress +
      ":57017/bilabor?authSource=admin",
    { useNewUrlParser: true, useUnifiedTopology: true }
  );
  redisClient = redis.createClient({
    host: serverAddress,
    port: 56379,
    password: password,
    retry_strategy: function () {},
  });

  // If all connection is successfull
  function connectionSuccesfull() {
    // Adding self to the users list
    redisClient.zadd(usersChannel, 0, username);
    // Notify about our login
    redisClient.publish(usersChannel, username);

    // Subscribing to important events
    // Separate clint is necessary for subscription, duplicate the original
    redisSubscriberClient = redisClient.duplicate();
    redisSubscriberClient.subscribe(roomsChannel);
    redisSubscriberClient.subscribe(usersChannel);
    redisSubscriberClient.subscribe(roomListChannel);
    redisSubscriberClient.on("message", function (channel, message) {
      if (channel === roomsChannel) {
        // New message to roomsChannel means the message history should be updated in a room
        messageCallback(message);
      } else if (channel === usersChannel) {
        // New message to usersChannel means the users list changed
        userCallback();
      } else if (channel === roomListChannel) {
        roomCallback();
      }
    });

    successCb();
  }

  // We dont know which callback is called first, so we will call back after the second
  db.then(function () {
    dbReady = true;
    if (mqReady === true) {
      connectionSuccesfull();
    }
  }, failCb);

  // Redis client events
  redisClient.on("ready", function () {
    mqReady = true;
    if (dbReady === true) {
      // If MongoDB is connected, login
      connectionSuccesfull();
    }
  });
  redisClient.on("error", failCb);
};

// Disconnect from server
chatService.disconnect = function () {
  if (!_.isUndefined(redisClient)) {
    redisClient.zrem(usersChannel, myUsername);
    redisClient.publish(usersChannel, myUsername);
  }
};

// Returns the messages in the room
chatService.getMessages = function (roomId, cb) {
  Message.find({ room: roomId }, function (err, msg) {
    cb(msg);
  });
};

// Returns the rooms
chatService.getRooms = function (cb) {
  Room.find(function (err, room) {
    cb(room);
  });
};

// Returns the logged in users list
chatService.getUsers = function (cb) {
  redisClient.zrange(usersChannel, 0, -1, function (error, result) {
    cb(result);
  });
};

chatService.createRoom = function (roomName) {
  let room = new Room({ name: roomName });
  room.save().then(function () {
    // Notify about updating messages in room
    redisClient.publish(roomListChannel, roomName);
  })
}

// Send message
chatService.sendMessage = function (roomId, message) {
  let msg = new Message({
    user: myUsername,
    avatarUrl: myAvatarUrl,
    date: message.date,
    content: message.content,
    room: roomId,
  });
  msg.save().then(function () {
    // Notify about updating messages in room
    redisClient.publish(roomsChannel, roomId);
  });
};

module.exports = chatService;
