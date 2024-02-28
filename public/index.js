
const socket = io();

const mapImage = new Image();
mapImage.src = "/bloco.png";

const newPiskel = new Image();
newPiskel.src = "/snowy-sheet.png";

const santaImage = new Image();
santaImage.src = "/boy.png";

const megaPhone = new Image();
megaPhone.src = "/megaphone.png";

const teste = new Image();
teste.src = "/teste.png";

const canvasEl = document.getElementById("canvas");
canvasEl.width = window.innerWidth;
canvasEl.height = window.innerHeight;
const canvas = canvasEl.getContext("2d");

const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" })

const localTracks = {
  audioTrack: null
}

let isPlaying = true

const remoteUsers = {};
window.remoteUsers = remoteUsers
const muteButton = document.getElementById("mute");
const uid = Math.floor(Math.random() * 1000000)

muteButton.addEventListener("click", () => {
  if (isPlaying) {
    localTracks.audioTrack.setEnabled(false)
    muteButton.innerText = 'unmute'
    socket.emit('mute', true)
  } else {
    localTracks.audioTrack.setEnabled(true)
    muteButton.innerText = 'mute'
    socket.emit('mute', false)
  }

  isPlaying = !isPlaying
})

const options = {
  appid: "94d21a0f8650491e989caa2a020f988c",
  channel: 'school',
  uid,
  token: null
}

async function subscribe(user, mediaType) {
  await client.subscribe(user, mediaType);
  if (mediaType === "audio") {
    user.audioTrack.play();
  }
}

function handleUserPublished(user, mediaType) {
  const id = user.uid;
  remoteUsers[id] = user;
  subscribe(user, mediaType);
}

function handleUserUnpublished(user) {
  const id = user.uid;
  delete remoteUsers[id];
}

async function join() {
  socket.emit("voiceId", uid);

  client.on("user-published", handleUserPublished);
  client.on("user-unpublished", handleUserUnpublished);

  await client.join(options.appid, options.channel, options.token || null, uid),

  localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack()


  await client.publish(Object.values(localTracks));
}

join();

let groundMap = [[]];
let decalMap = [[]];
let players = [];
let school = [[]];

const TILE_SIZE = 32;

socket.on("connect", () => {
  console.log("connected");
});

socket.on("map", (loadedMap) => {
  groundMap = loadedMap.ground;
  decalMap = loadedMap.decal;
});

socket.on("players", (serverPlayers) => {
  players = serverPlayers;
});


const inputs = {
  up: false,
  down: false,
  left: false,
  right: false,
};

let direcaoAtual = ''; // Variável para armazenar a direção atual
let ultimaDirecao = ''; // Variável para armazenar a última direção de movimento

const walkingFrames = {
  up: [],
  down: [],
  left: [],
  right: []
};

// Carregar as imagens para a animação de andar em todas as direções
for (let direction in walkingFrames) {
  for (let i = 1; i <= 3; i++) {
      let frame = new Image();
      frame.src = `./boy_walk_${direction}_${i}.png`;
      walkingFrames[direction].push(frame);
  }
}

window.addEventListener("keydown", (e) => {
  if (e.key === "w") {
    inputs["up"] = true;
    ultimaDirecao = 'up';
  } else if (e.key === "s") {
    inputs["down"] = true;
    ultimaDirecao = 'down';
  } else if (e.key === "d") {
    inputs["right"] = true;
    ultimaDirecao = 'right';
    santaImage.src = './boy_walk_right_1.png'
  } else if (e.key === "a") {
    inputs["left"] = true;
    ultimaDirecao = 'left';
  }
  socket.emit("inputs", inputs);
});

window.addEventListener("keyup", (e) => {
  if (e.key === "w") {
    inputs["up"] = false;
  } else if (e.key === "s") {
    inputs["down"] = false;
  } else if (e.key === "d") {
    inputs["right"] = false;
  } else if (e.key === "a") {
    inputs["left"] = false;
  }
  socket.emit("inputs", inputs);
});


function loop() {
  canvas.clearRect(0, 0, canvasEl.width, canvasEl.height);

  const myPlayer = players.find((player) => player.id === socket.id);
  let cameraX = 0;
  let cameraY = 0;
  if (myPlayer) {
    cameraX = parseInt(myPlayer.x - canvasEl.width / 2);
    cameraY = parseInt(myPlayer.y - canvasEl.height / 2);
  }

  const TILES_IN_ROW = 8;

  // ground
  for (let row = 0; row < groundMap.length; row++) {
    for (let col = 0; col < groundMap[0].length; col++) {
      let { id } = groundMap[row][col];
      const imageRow = parseInt(id / TILES_IN_ROW);
      const imageCol = id % TILES_IN_ROW;
      canvas.drawImage(
        mapImage,
        imageCol * TILE_SIZE,
        imageRow * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
        col * TILE_SIZE - cameraX,
        row * TILE_SIZE - cameraY,
        TILE_SIZE,
        TILE_SIZE
      );
    }
  }

  // decals
  for (let row = 0; row < decalMap.length; row++) {
    for (let col = 0; col < decalMap[0].length; col++) {
      let { id } = decalMap[row][col] ?? { id: undefined };
      const imageRow = parseInt(id / TILES_IN_ROW);
      const imageCol = id % TILES_IN_ROW;

      canvas.drawImage(
        teste,
        imageCol * TILE_SIZE,
        imageRow * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
        col * TILE_SIZE - cameraX,
        row * TILE_SIZE - cameraY,
        TILE_SIZE,
        TILE_SIZE
      );
    }
  }
  
  

  for (const player of players) {
    let direcaoAtual = ultimaDirecao || 'up';
    let walkingFramesIndex = 0;

    if (inputs["up"]) {
      direcaoAtual = 'up';
    } else if (inputs["down"]) {
        direcaoAtual = 'down';
    } else if (inputs["left"]) {
        direcaoAtual = 'left';
    } else if (inputs["right"]) {
        direcaoAtual = 'right';
    } else {
      direcaoAtual = ultimaDirecao
      
    }

    

    if (walkingFrames[direcaoAtual] !== undefined) {
      // Verifica se o jogador está se movendo para alternar entre os quadros de animação
      if (inputs["up"] || inputs["down"] || inputs["left"] || inputs["right"]) {
        walkingFramesIndex = Math.floor(Date.now() / 100) % walkingFrames[direcaoAtual].length;
      }

      canvas.drawImage(walkingFrames[direcaoAtual][walkingFramesIndex], player.x - cameraX, player.y - cameraY);
    }
    
  
  
  
  if (!player.isMuted) {
      canvas.drawImage(megaPhone, player.x - cameraX + 5, player.y - cameraY - 28);
    }

    if (player !== myPlayer) {
      if (
        remoteUsers[player.voiceId] &&
        remoteUsers[player.voiceId].audioTrack
      ) {
        const distance = Math.sqrt(
          (player.x - myPlayer.x) ** 2 + (player.y - myPlayer.y) ** 2
        );
        
        // Calcular o fator multiplicador do volume
        const maxDistance = 700; // Distância máxima para volume reduzido
        const volumeMultiplier = Math.max(0, 1 - distance / maxDistance); // Garante que o volumeMultiplier seja entre 0 e 1
    
        // Aplicar o fator multiplicador ao volume
        const baseVolume = 100; // Volume base (máximo)
        const adjustedVolume = Math.floor(baseVolume * volumeMultiplier);
    
        // Definir o volume do áudio do jogador remoto
        remoteUsers[player.voiceId].audioTrack.setVolume(adjustedVolume);
      }
    }
    
  }

  window.requestAnimationFrame(loop);
}

window.requestAnimationFrame(loop);
