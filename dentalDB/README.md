Prerequisites: You must have NodeJS >14 and Node Package Manager.

start by entering the server directory, 

run the following commands:
npm i express
npm i ws
npm i pg

create a config.json with the following keys pointing to your local postgres database.

user: 
host: 
database: 
password: 
port: 

run the node server with
node server.js

connect on localhost:4000