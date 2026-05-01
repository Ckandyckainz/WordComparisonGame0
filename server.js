let http = require("http");
let fs = require("fs");

let idsInUse = [];
let clientConnected = [];
let requestsForClients = [];
let usernames = [];
let adjectives = [];
let nouns = [];
let clientNouns = [];
let submittedNouns = [];
let gameState = "waiting for players";
let currentNumberOfPlayers = 0;
let currentPlayerIDs = [];
let currentAdjective;
let currentJudgeID;
let roundWinner;

http.createServer((req, res)=>{
  let body = [];
  req.on("data", (chunk)=>{
    body.push(chunk);
  }).on("end", ()=>{
    body = Buffer.concat(body).toString();
    if (req.url == "/") {
      fs.readFile("index.html", function (err, data) {
        res.writeHead(200, {"Content-Type": "text/html"});
        res.write(data);
        return res.end();
      });
    } else if (req.url == "/pickuprequests") {
      let clientID = JSON.parse(body);
      clientConnected[clientID] = 0;
      res.writeHead(200, {"Content-Type": "application/json"});
      res.end(JSON.stringify(requestsForClients[clientID]));
      requestsForClients[clientID] = [];
    } else if (req.url == "/getid") {
      let id = 0;
      let done = false;
      while (!done) {
        done = true;
        for (let i=0; i<idsInUse.length; i++) {
          if (idsInUse[i] == id) {
            done = false;
            id ++;
          }
        }
      }
      idsInUse.push(id);
      clientConnected[id] = 0;
      requestsForClients[id] = [];
      res.writeHead(200, {"Content-Type": "application/json"});
      res.end(JSON.stringify(id));
    } else if (req.url == "/joingame") {
      let client = JSON.parse(body);
      adjectives.push(...client.adjectives);
      nouns.push(...client.nouns);
      usernames[client.id] = client.username;
      let currentClientNouns = [];
      for (let i=0; i<5; i++) {
        dealNoun(currentClientNouns);
      }
      clientNouns[client.id] = currentClientNouns;
      requestsForClients[client.id].push({reqtype: "/setclientnouns", body: clientNouns[client.id]});
      currentNumberOfPlayers ++;
      currentPlayerIDs.push(client.id);
      requestsForClients[client.id].push({reqtype: "/setadjective", body: currentAdjective});
      requestsForClients[client.id].push({reqtype: "/setjudge", body: {id: currentJudgeID, username: usernames[currentJudgeID]}});
      if (gameState == "waiting for players" && currentNumberOfPlayers >= 1) {
        startRound();
      }
    } else if (req.url == "/submitnoun") {
      let client = JSON.parse(body);
      submittedNouns.push(client);
      if (submittedNouns.length == currentPlayerIDs.length-1) {
        startJudging();
      }
    } else if (req.url == "/judgesubmitnoun") {
      roundWinner = JSON.parse(body);
      console.log(roundWinner);
      startRound();
    }
  });
}).listen(8080);

function dealNoun(array){
  let nounIndex = Math.floor(Math.random()*nouns.length);
  array.push(nouns[nounIndex]);
  nouns.splice(nounIndex, 1);
}

function startRound(){
  console.log("starting round...");
  gameState = "noun selection";
  currentAdjective = adjectives[Math.floor(Math.random()*adjectives.length)];
  currentJudgeID = currentPlayerIDs[Math.floor(Math.random()*currentPlayerIDs.length)];
  submittedNouns = [];
  for (let i=0; i<currentPlayerIDs.length; i++) {
    let id = currentPlayerIDs[i];
    if (clientNouns[id].length == 4) {
      dealNoun(clientNouns[id]);
      requestsForClients[id].push({reqtype: "/setclientnouns", body: clientNouns[id]});
    }
    requestsForClients[id].push({reqtype: "/setadjective", body: currentAdjective});
    requestsForClients[id].push({reqtype: "/setjudge", body: {id: currentJudgeID, username: usernames[currentJudgeID]}});
  }
}

function startJudging(){
  console.log("Starting judging...");
  gameState = "judging";
  for (let i=0; i<currentPlayerIDs.length; i++) {
    let id = currentPlayerIDs[i];
    requestsForClients[id].push({reqtype: "/startjudging", body: submittedNouns});
  }
}

function connectTestLoop(){
  for (let i=0; i<clientConnected.length; i++) {
    clientConnected[i] ++;
    if (clientConnected[i] > 61) {
      clientConnected[i] = undefined;
      requestsForClients[i] = undefined;
      for (let j=0; j<idsInUse.length; j++) {
        if (idsInUse[j] == i) {
          idsInUse.splice(i, 1);
        }
      }
    }
  }
  setTimeout(connectTestLoop, 60000);
}
connectTestLoop();