# GridIO
A simple fun real-time multiplayer game where you control tiles on a grid. Push other players tiles and surround them to capture them. Fight to control the most tiles.

There a single page frontend which displays the grid and game activity with a HTML canvas. Moves are sent via Socket.IO to the Node.js backend where they are processed. Changes in board state are then broadcast to all players on that grid. Multiple games can take place simultaneously with matchmaking. Custom games with varying sizes and publicity can be created.

This was created primarily as a learning exercise in Node.js, Socket.IO and general Javascript practices.

Find the test server hosted on Heroku [here](http://gridio.herokuapp.com).
