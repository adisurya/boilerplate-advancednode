$(document).ready(function () {
  let socket = io();

  socket.on('user', function(data) {
    $('#num-users').text(data.currentUsers + 'users online');
    let message = data.username + (data.connected ? ' has joined the chat.': ' has left the chat.');
    $('#messages').append($('<li>').html(`<b>${message}</b>`));
  });

  // Form submittion with new message in field with id 'm'
  $('form').submit(function () {
    var messageToSend = $('#m').val();
    socket.emit('chat message', messageToSend);
    $('#m').val('');
    return false; // prevent form submit from refreshing page
  });
  socket.on('chat message', function(data) {
    $('#messages').append($('<li>').html(`${data.username}: ${data.message}`));
  });
});
