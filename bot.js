// add category + voice, close all
// allow students to create chat rooms


const Discord = require('discord.js');
const auth = require('./auth.json');
const client = new Discord.Client({partials: ['MESSAGE', 'CHANNEL', 'REACTION']});
client.login(auth.token);

const ADD = '❔';
const BOT_NAME = 'PanelQueue';
const CHANNEL_NAME = 'queue';
const EMBED_COLOR = '#0099ff';
const ROLE = 'mod';

// PRINTING
const EMPTY_SPACE = '\u200b';
const LINE = '------------------------------------------';

// COMMANDS
const CLEAR_COMMAND = '!clear';
const CLOSE_COMMAND = '!close';
const NEXT_COMMAND = '!next';
const HELP_COMMAND = '!help';
const TICKET_COMMAND = '!ticket';
const VIEW_PANEL_COMMAND = '!cq';

var globalQueue = {}; // maps guild id to queue

client.on('message', message => {
  if (!message.member.roles.cache.some(role => role.name === ROLE)) {
    return;
  }

  const serverId = message.guild.id;
  var queue = serverId in globalQueue ? globalQueue[serverId] : [];

  const channelName = message.channel.name;
  if (channelName.startsWith('ticket-') && message.content === CLOSE_COMMAND) {
    message.channel.delete();
    message.guild.channels.cache.forEach(channel => {
      if (channel.name.toLowerCase().includes(channelName.toLowerCase())) {
        channel.delete().catch(() => {});
      }
    });
  }

  if (channelName != CHANNEL_NAME) {
    return;
  }

  switch(message.content) {
    case HELP_COMMAND:
      message.channel.send(embedHelp());
      break;

    case NEXT_COMMAND:
      queue.pop();

    case TICKET_COMMAND:
      if (queue.length > 0) {
        const user = queue.shift();
        const name = `ticket-${sanitizeUsername(user.username)}`;
        const channels = message.guild.channels;
        channels.create(name, { type: 'category'}).then(channel => {
          channels.create(name, {type: 'text'}).then(textChannel => {
            textChannel.setParent(channel.id);
            embedUser(user, textChannel, message.author);
          });
          channels.create(name, {type: 'voice'}).then(voiceChannel => {
            voiceChannel.setParent(channel.id);
          });
        });
      }

    case CLEAR_COMMAND:
      queue = [];

    default:
      addReactions(message.channel, queue);

    globalQueue[serverId] = queue;
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  handleUser(reaction, user);
});

client.on('messageReactionRemove', async (reaction, user) => {
  handleUser(reaction, user);
});

function handleUser(reaction, user) {
  const serverId = reaction.message.guild.id;
  const queue = serverId in globalQueue ? globalQueue[serverId] : [];

  globalQueue[serverId] = !queue.includes(user) ? 
      updateQueue(user, reaction, queue, true) : updateQueue(user, reaction, queue, false);
}

function updateQueue(user, reaction, queue, isPush) {
  const username = user.username;
  if (username != BOT_NAME) {
    const channel = reaction.message.channel;
    addReactions(channel, queue);
    isPush ? queue.push(user) : queue.splice(queue.indexOf(user), 1);
  }
  return queue;
}

function embedQueue(queue) {
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

function addReactions(channel, queue) {
  clear(channel);
  channel.send(embedQueue(queue)).then(message => {
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

function embedHelp() {
  return new Discord.MessageEmbed()
	.setColor(EMBED_COLOR)
	.setTitle('COMMANDS')
	.setDescription(`Here are all the commands you can use if you have a ${ROLE} role`)
	.addFields(
		{ name: LINE + '\nGeneral\n' + LINE, value: "!help: shows all commands for this bot"},
		{ name: LINE + '\nQueue\n' + LINE, value: queueCommands()},
		{ name: LINE + '\nTicketing\n' + LINE, value: ticketCommands()},
	)
}

function queueCommands() {
  return VIEW_PANEL_COMMAND + ": shows panel to enable queueing and to view current line\n" +
    NEXT_COMMAND + ": removes next person in the queue";
}

function ticketCommands() {
  return TICKET_COMMAND + ": removes next person in queue and creates a ticket\n" +
    CLOSE_COMMAND + ": closes ticket";
}

function sanitizeUsername(name) {
  return name.replace(/\W/g, '').toLowerCase();
}
