//// https://discordjs.guide/popular-topics/reactions.html#listening-for-reactions-on-old-messages

const Discord = require('discord.js');
const auth = require('./auth.json');
const client = new Discord.Client({partials: ['MESSAGE', 'CHANNEL', 'REACTION']});
client.login(auth.token);

const ADD = '❔';
const CHANNEL_NAME = 'queue';
const BOT_NAME = 'PanelQueue';
const TICKETS_ID = '736035106195767388';
const VIEW_PANEL_COMMAND = '!cq';
const NEXT_COMMAND = '!next';
const TICKET_COMMAND = '!ticket';

var queue = [];

client.on('message', message => {
  if (message.channel.name != CHANNEL_NAME) {
    return;
  }
  switch(message.content) {
    case VIEW_PANEL_COMMAND:
      addReactions(message.channel);
      break;
    case NEXT_COMMAND:
      //client.channels.cache.get(TICKETS_ID).send(`$new ${queue.pop()}`);
      queue.shift();
      addReactions(message.channel);
      break;
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  handleUser(reaction, user);
});

client.on('messageReactionRemove', async (reaction, user) => {
  handleUser(reaction, user);
});

function handleUser(reaction, user) {
  if (!queue.includes(user)) {
    updateQueue(user, reaction, true);
  } else if (queue.includes(user)) {
    updateQueue(user, reaction, false);
  }
}

function updateQueue(user, reaction, isPush) {
  const username = user.username;
  if (username != BOT_NAME) {
    const channel = reaction.message.channel;
    isPush ? queue.push(user) : queue.splice(queue.indexOf(user), 1);
    addReactions(channel);
  }
}

function embed() {
  return new Discord.MessageEmbed()
    .setColor('#0099ff')
    .setTitle('Queue!')
    .setDescription('Click on the ' + ADD + 'below to get in line and to leave the line')
    .addFields(
      {
        name: 'Current Queue Length: ' + queue.length, 
        value: queue.length > 0 ? queue.map((user, index) => `${index + 1} - ${user.username}\n`) : '\u200b'
      },
    );
}

function addReactions(channel) {
  clear(channel);
  channel.send(embed()).then(message => {
    addReactions(message.react(ADD));
  }).catch(() => {});
}

function clear(channel) {
  channel.messages.fetch({limit: 99})
    .then(fetched => {
      channel.bulkDelete(fetched);
    })
    .catch(err => {});
}
