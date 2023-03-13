import http from "http";
import * as fs from 'node:fs';
import * as path from 'path';
import WebSocket from "websocket";
let __dirname = path.resolve();

let connections = {};
let senders = [];
let recievers = [];

//Modify the server as per your filepaths
const server = http.createServer((req, res) => {
    if (Object.keys(connections).length > 5) res.end("Max users reached!")
    const getFile = (name) => {
        fs.readFile(__dirname + `\\${name}`, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end(JSON.stringify(err));
                return;
              }
              res.writeHead(200);
              res.end(data);
        });
    };

    if (req.url === "/") getFile("index.html");
    if (req.url === "/index.js") getFile("index.js");
    if (req.url === "/index.css") getFile("index.css");
});

let WebSocketServer = WebSocket.server;

const websocketServer = http.createServer((req, res) => {
    res.writeHead(200)
}).listen(8895, () => console.log("Listening on", 8895));

const wsServer = new WebSocketServer({
    "httpServer": websocketServer
});

wsServer.on("request", (req) => {
    const connection = req.accept(null, req.origin);
    let userId = assignUserId();

    connections[userId] = connection;

    console.log(`user: ${userId} connected`);

    connection.send(JSON.stringify({
        type: "user-id",
        userId: userId
    }));
    
    connection.on("message", (msg) => {
        let data = JSON.parse(msg.utf8Data);
        if (data.type === "join") {
            Object.keys(connections).map((id) => {
                if (id !== userId) connections[id].send(JSON.stringify({
                    type: "join",
                    userId: userId
                }));
            });
        };

        if (data.type === "sender") {
            senders.push(data.userId);
            sendReceiversList();
        };

        if (data.type === "reciever") {
            recievers.push(data.userId);
            sendReceiversList();
        };

        if (data.type === "initate") {
            connections[data.userId].send(JSON.stringify({
                type: "join",
                userId: userId,
                target: data.target
            }));
        };

        if (data.type === "offer" || data.type === "answer" || data.type === "new-ice-candidate" 
        || data.type === "accept-request" || data.type === "request-status") {
            connections[data.target].send(JSON.stringify(data));
        };
    });
    connection.on("close", () => {
        senders = senders.filter((id) =>  id !== userId);
        recievers = recievers.filter((id) =>  id !== userId);

        delete connections[userId];
        console.log(`user: ${userId} disconnected`);
        sendReceiversList();
    });
});

const sendReceiversList = () => {
    senders.map((id) => {
        connections[id].send(JSON.stringify({
            type: "all-recievers",
            userIds: recievers
        }));
    });
};

const assignUserId = () => {
    let userId = String(Math.floor(1000 + Math.random() * 9000));

    if (userId in connections) {
        return assignUserId();
    };

    return userId;
};

server.listen(6888, () => console.log("Listening on 6888"));
