const Discord = require('discord.js');
const auth = require('./auth.json');
const client = new Discord.Client({partials: ['MESSAGE', 'CHANNEL', 'REACTION']});
client.login(auth.token);

const ADD = '❔';
const CHANNEL_NAME = 'queue';
const BOT_NAME = 'PanelQueue';

// COMMANDS
const VIEW_PANEL_COMMAND = '!cq';
const NEXT_COMMAND = '!next';
const TICKET_COMMAND = '!ticket';
const CLOSE_COMMAND = '!close';
const EMBED_COLOR = '#0099ff';

var queue = [];

client.on('message', message => {
  if (!message.member.roles.cache.some(role => role.name === 'mod')) {
    return;
  }

  if (message.channel.name.startsWith('ticket-') && message.content === CLOSE_COMMAND) {
    message.channel.delete();
  }

  if (message.channel.name != CHANNEL_NAME) {
    return;
  }

  switch(message.content) {
    case TICKET_COMMAND:
      const user = queue.shift();
      message.guild.channels.create(`ticket-${user.username}`, { type: 'text', }).then(channel => {
        embedUser(user, channel, message.author);
      });

    case NEXT_COMMAND:
      queue.pop();

    default:
      addReactions(message.channel);
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

function embedQueue() {
  return new Discord.MessageEmbed()
    .setColor(EMBED_COLOR)
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
  channel.send(embedQueue()).then(message => {
    message.react(ADD);
  }).catch(() => {});
}

function clear(channel) {
  channel.messages.fetch({limit: 99})
    .then(fetched => {
      channel.bulkDelete(fetched);
    })
    .catch(err => {});
}

function embedUser(user, channel, messager) {
  channel.send(`@${user.username} Welcome! Please describe your question or issue. @${messager.username} is here to help you!`);
}
