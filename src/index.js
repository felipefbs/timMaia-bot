const Discord = require("discord.js");
const ytdl = require("ytdl-core");
require("dotenv").config();

const { lofiList, musicList } = require("../util/urls.js");

token = process.env.TOKEN;
prefix = process.env.PREFIX;

const client = new Discord.Client();
const queue = new Map();

const config = require('../util/data.json');
const wrongChanelPlay = config.messages.channel.play;
const wrongChanelStop = config.messages.channel.stop;
const permissionError = config.messages.permission;
const noSongToSkip = config.messages.song;

client.login(token);

client.on("message", async (message) => {
  if (message.author.bot) return;
  msg = message.content.toLowerCase();
  if (!msg.startsWith(prefix)) return;

  const serverQueue = queue.get(message.guild.id);

  if (msg.startsWith(`${prefix} toca essa`)) {
    const args = msg.split(" ");
    execute(message, serverQueue, { urlMusic: args[3] });
    return;
  }
  if (msg.startsWith(`${prefix} toca lofi`)) {
    url = Math.floor(Math.random() * lofiList.length);
    execute(message, serverQueue, { urlMusic: url, urlList: lofiList });
    return;
  }
  if (msg.startsWith(`${prefix} toca uma`)) {
    url = Math.floor(Math.random() * musicList.length);
    execute(message, serverQueue, { urlMusic: url, urlList: musicList });
    return;
  }
  if (msg.startsWith(`${prefix} olha o breque`)) {
    stop(message, serverQueue);
    return;
  }
  if (msg.startsWith(`${prefix} passa essa`)) {
    skip(message, serverQueue);
    return;
  }
});


const execute = async (message, serverQueue, musicObj) => {
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(`${wrongChanelPlay}`);

  const permissions = voiceChannel.permissionsFor(message.client.user);

  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(`${permissionError}`);
  }

  let songInfo;

  if (musicObj.urlList) {
    songInfo = await ytdl.getInfo(musicObj.urlList[musicObj.urlMusic]);
  } else {
    songInfo = await ytdl.getInfo(musicObj.urlMusic);
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

const play = (guild, song) => {
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

const skip = (message, serverQueue) => {
  if (!message.member.voice.channel) {
    return message.channel.send(`${wrongChanelStop}`);
  }
  if (!serverQueue) {
    return message.channel.send(`${noSongToSkip}`);
  }
  serverQueue.connection.dispatcher.end();
}

const stop = (message, serverQueue) => {
  if (!message.member.voice.channel) {
    return message.channel.send(`${wrongChanelStop}`);
  }
  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}