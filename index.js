const Discord = require("discord.js");
const ytdl = require("ytdl-core");

require("dotenv").config();

token = process.env.TOKEN;
prefix = process.env.PREFIX;

const client = new Discord.Client();
const queue = new Map();

client.login(token);

client.once("ready", () => {
  console.log("Ready!");
});
client.once("reconnecting", () => {
  console.log("Reconnecting!");
});
client.once("disconnect", () => {
  console.log("Disconnect!");
});
