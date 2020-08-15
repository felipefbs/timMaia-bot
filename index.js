const Discord = require("discord.js");
const ytdl = require("ytdl-core");
require("dotenv").config();

const { lofiList, musicList } = require("../util/urls.js");

token = process.env.TOKEN;
prefix = process.env.PREFIX;

const client = new Discord.Client();
const queue = new Map();

client.login(token);

client.on("message", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const serverQueue = queue.get(message.guild.id);

  if (message.content.startsWith(`${prefix} toca essa`)) {
    const args = message.content.split(" ");
    url = args[3];
    execute(message, serverQueue, url);
    return;
  }
  if (message.content.startsWith(`${prefix} toca lofi`)) {
    url = Math.floor(Math.random() * lofiList.length);
    execute(message, serverQueue, url);
    return;
  }
  if (message.content.startsWith(`${prefix} olha o breque`)) {
    stop(message, serverQueue);
    return;
  }
  if (message.content.startsWith(`${prefix} passa essa`)) {
    skip(message, serverQueue);
    return;
  }
});

async function execute(message, serverQueue, url) {
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(
      "You need to be in a voice channel to play music!"
    );
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "I need the permissions to join and speak in your voice channel!"
    );
  }
  let songInfo;
  if (typeof url === "string") {
    songInfo = await ytdl.getInfo(url);
  } else if (typeof url === "number") {
    songInfo = await ytdl.getInfo(lofiList[url]);
  }
  const song = {
    title: songInfo.videoDetails.title,
    url: songInfo.videoDetails.video_url,
  };

  if (!serverQueue) {
    const queueContract = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true,
    };

    queue.set(message.guild.id, queueContract);

    queueContract.songs.push(song);

    try {
      let connection = await voiceChannel.join();
      queueContract.connection = connection;

      play(message.guild, queueContract.songs[0]);
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    console.log(serverQueue.songs);
    return message.channel.send(`${song.title} has been added to the queue!`);
  }
}

function play(guild, song) {
  const serverQueue = queue.get(guild.id);

  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }

  const dispatcher = serverQueue.connection
    .play(ytdl(song.url))
    .on("finish", () => {
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on("error", (error) => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(`Start playing **${song.title}**`);
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel) {
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
  }
  if (!serverQueue) {
    return message.channel.send(" There is no song that I could skip");
  }
  serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel) {
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
  }
  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}
