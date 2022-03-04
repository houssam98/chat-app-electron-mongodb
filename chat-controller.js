const chatService = require("./chat-service.js");
const _ = require("lodash");

const chatController = {};

// Initialize the settings
let selectedRoom = "default";
let myUsername = "";
let myAvatarUrl = "";

// Called at login and inicializes the default room
chatController.login = function () {
  let usernameInput = document.getElementById("usernameInput");
  let avatarUrlInput = document.getElementById("avatarUrlInput");
  let serverInput = document.getElementById("serverInput");
  let passwordInput = document.getElementById("passwordInput");

  if (_.isEmpty(usernameInput.value) || _.isEmpty(serverInput.value)) {
    alert("Please provide every data!");
  } else {
    myUsername = _.escape(usernameInput.value);
    myAvatarUrl = _.escape(avatarUrlInput.value);
    chatService.connect(
      usernameInput.value,
      avatarUrlInput.value,
      serverInput.value,
      passwordInput.value,
      function () {
        // Connection successful
        // Swich screen (poorman’s SPA)
        document.getElementById("login-window").style.display = "none";
        document.getElementById("main-window").style.display = "flex";

        // Print the logged in username
        document.getElementById("username").innerText = myUsername;
        chatController.refreshRooms();
        chatController.refreshUsers();
        chatController.refreshRoom();
      },
      function (err) {
        alert("Could not connect to the database: " + err);
      },
      // New message received somewhere (event on roomsChannel)
      function (roomName) {
        if (roomName === selectedRoom) {
          chatController.refreshRoom();
        }
      },
      // User number changed
      function () {
        chatController.refreshUsers();
      },
      function () {
        chatController.refreshRooms();
      }
    );
  }
};

chatController.createRoom = function () {
  let roomNameInput = document.getElementById("roomNameInput");
  chatService.createRoom(roomNameInput.value);
};

// Print a new message at message history
chatController.renderNewMessage = function (message) {
  // Fing the messages history area in the DOM with ID "messages", it is an unnumbered list (<ul>).
  let messageArea = document.getElementById("messages");

  // Fill and add a new message based ont he HTML template
  messageArea.insertAdjacentHTML(
    "beforeEnd",
    '<div class="media messages">' +
      `<img src="${_.escape(
        message.avatarUrl ? message.avatarUrl : "assets/user.png"
      )}" width="40" height="40" class="mr-3 message-avatar">` +
      '<div class="media-body">' +
      '<h5 class="mt-0">' +
      _.escape(message.user) +
      "</h5>" +
      _.escape(message.content) +
      "</div>" +
      "</div>" +
      "<hr>"
  );

  // Scroll down to the bottom of the history
  document
    .getElementById("messages-panel")
    .scrollTo(0, messageArea.scrollHeight);
};

// Prints a username on users list
chatController.renderNewUser = function (user) {
  let userList = document.getElementById("user-list");
  let listedUser = _.escape(user);

  // Name a private room between two users. The order is important due to two-way communication.
  let keys = _.orderBy([myUsername, listedUser]);
  let privateRoomName = keys[0] + "_" + keys[1];

  if (selectedRoom === privateRoomName) {
    // If we already there, no link is necessary.
    userList.insertAdjacentHTML(
      "beforeEnd",
      '<li class="selector-panel-item selected"><b>' + listedUser + "</b></li>"
    );
  } else {
    userList.insertAdjacentHTML(
      "beforeEnd",
      '<li class="selector-panel-item" onclick="chatController.changeRoom(\'' +
        privateRoomName +
        "')\">" +
        listedUser +
        "</li>"
    );
  }
};

// Prints a room name on rooms list
chatController.renderNewRoom = function (room) {
  let roomsList = document.getElementById("room-list");

  if (selectedRoom === room.name) {
    roomsList.insertAdjacentHTML(
      "beforeEnd",
      '<li class="selector-panel-item selected" onclick="chatController.changeRoom(\'' +
        room.name +
        "')\"><b>" +
        room.name +
        "</b></li>"
    );
  } else {
    roomsList.insertAdjacentHTML(
      "beforeEnd",
      '<li class="selector-panel-item" onclick="chatController.changeRoom(\'' +
        room.name +
        "')\">" +
        room.name +
        "</li>"
    );
  }
};

// Send a new message with our username
chatController.sendMessage = function () {
  let textInput = document.getElementById("new-message-text");
  if (!_.isEmpty(textInput.value)) {
    let message = {
      user: myUsername,
      avatarUrl: myAvatarUrl,
      content: textInput.value,
      date: new Date(),
    };
    chatController.renderNewMessage(message);
    chatService.sendMessage(selectedRoom, message);
  }
  textInput.value = "";
};

// Switching room
chatController.changeRoom = function (roomName) {
  selectedRoom = roomName;
  chatController.refreshRoom();
  chatController.refreshUsers();
  chatController.refreshRooms();
};

// Updating the messages in room
chatController.refreshRoom = function () {
  document.getElementById("messages").innerHTML = "";
  // Load the messages history
  chatService.getMessages(selectedRoom, function (messages) {
    _.forEach(messages, function (message) {
      chatController.renderNewMessage(message);
    });
  });
};

// Update the rooms list
chatController.refreshRooms = function () {
  document.getElementById("room-list").innerHTML = "";
  // Load the rooms (without self)
  chatService.getRooms(function (rooms) {
    _.forEach(rooms, function (room) {
      chatController.renderNewRoom(room);
    });
  });
};

// Update the users list content
chatController.refreshUsers = function () {
  document.getElementById("user-list").innerHTML = "";
  // Load the users (without self)
  chatService.getUsers(function (users) {
    _.forEach(users, function (user) {
      if (myUsername !== user) {
        chatController.renderNewUser(user);
      }
    });
  });
};

module.exports = chatController;
