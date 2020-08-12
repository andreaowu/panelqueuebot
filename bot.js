//Invite link: https://discord.com/api/oauth2/authorize?client_id=735918166470819850&permissions=8272&scope=bot

const Discord = require('discord.js');
const client = new Discord.Client();
// const auth = require('./auth.json');
// client.login(auth.token);
client.login(process.env.token);

const ADD = '❔';
const EMBED_COLOR = '#0099ff';

// MODS
const EVERYONE = '@everyone';
const MOD = 'mod';
const BOT = 'PanelQueue';

// CHANNELS
const ARCHIVE_CHANNEL = "archive";
const QUEUE_CHANNEL = 'queue';
const HELP_CHANNEL = 'bot-help';
const EXAM_CHANNEL_PREFIX = 'test-';

// PRINTING
const EMPTY_SPACE = '\u200b';
const LINE = '------------------------------------------';

// COMMANDS
const CLEAR_COMMAND = '!clear';
const CLOSE_COMMAND = '!close';
const NEXT_COMMAND = '!next';
const HELP_COMMAND = '!help';
const TICKET_COMMAND = '!ticket';
const EXAM_COMMAND = "!exam";
const EXAM_END_COMMAND = "!end";
const QUEUE_COMMAND = '!q';

var globalQueue = {}; // maps guild id to queue

client.on("guildCreate", guild => {
  const channels = guild.channels;
  const roles = findAllRoles(guild.roles.cache);

  if (!channels.cache.filter(channel => channel.name == BOT).size) {
    channels.create(BOT, {type: 'category'}).then(channel => {
      channels.create(QUEUE_CHANNEL,
        {
          type: 'text', 
          permissionOverwrites: [
            {
              id: roles[EVERYONE],
              allow: ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY'],
            },
            {
              id: roles[EVERYONE],
              deny: ['SEND_MESSAGES', 'MANAGE_CHANNEL'],
            },
            {
              id: roles[BOT],
              allow: ['SEND_MESSAGES'],
            },
            {
              id: roles[MOD],
              allow: ['SEND_MESSAGES'],
            }
          ],
        }).then(textChannel => {
        textChannel.setParent(channel.id);
        textChannel.send("Only use this channel to get in line and leave line.");
        addReactions(textChannel, []);
      });
      channels.create(HELP_CHANNEL, 
        {
          type: 'text', 
          permissionOverwrites: [
            {
              id: roles[EVERYONE],
              deny: ['VIEW_CHANNEL'],
            },
            {
              id: roles[BOT],
              allow: ['VIEW_CHANNEL'],
            },
            {
              id: roles[MOD],
              allow: ['VIEW_CHANNEL', 'MANAGE_CHANNEL'],
            }
          ],
        }).then(textChannel => {
        textChannel.setParent(channel.id);
        textChannel.send("Use this channel to get help from the bot.");
        textChannel.send(embedHelp());
      });
    });
    channels.create(ARCHIVE_CHANNEL, {
      type: 'category', 
      permissionOverwrites: [
        {
          id: roles[EVERYONE],
          deny: ['MANAGE_CHANNEL', 'SEND_MESSAGES'],
        },
        {
          id: roles[BOT],
          allow: ['VIEW_CHANNEL'],
        },
        {
          id: roles[MOD],
          allow: ['VIEW_CHANNEL', 'MANAGE_CHANNEL'],
        }
      ]
    });
  }
  globalQueue[guild.id] = [];
});

client.on('message', message => {
  if (!message.member.roles.cache.some(role => role.name === MOD)) {
    return;
  }

  const serverId = message.guild.id;
  var queue = serverId in globalQueue ? globalQueue[serverId] : [];

  const cacheRoles = message.guild.roles.cache;
  const roles = findAllRoles(cacheRoles);

  const channels = message.guild.channels;
  const channelsList = channels.cache;
  const channelName = message.channel.name;

  if (channelName.startsWith('ticket-') && message.content === CLOSE_COMMAND) {
    message.channel.updateOverwrite(message.channel.guild.roles.everyone, {'SEND_MESSAGES': false, 'VIEW_CHANNEL': false});
    const archiveChannel = channelsList.find(channel => equalChannelNames(channel.name, ARCHIVE_CHANNEL));
    message.channel.setParent(archiveChannel.id);

    channelsList.forEach(channel => {
      if (equalChannelNames(channel.name, channelName) && (channel.type === 'voice' || channel.type === 'category')) {
        channel.delete().catch(() => {});
      }
    });
    message.delete();
    return;
  }

  if (channelName == HELP_CHANNEL && message.content === HELP_COMMAND) {
    message.channel.send(embedHelp());
    return;
  }

  if (channelName != QUEUE_CHANNEL) {
    return;
  }

  const newChannelPermissions = [
    {
      id: roles[EVERYONE],
      deny: ['VIEW_CHANNEL'],
    },
    {
      id: roles[BOT],
      allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
    },
    {
      id: roles[MOD],
      allow: ['VIEW_CHANNEL'],
    }
  ];

  const spaceIndex = message.content.indexOf(" ");
  switch(message.content.substring(0, spaceIndex > 0 ? spaceIndex : message.content.length)) {
    case NEXT_COMMAND:
      embedNext(queue.shift(), existingChannel(channelsList, HELP_CHANNEL), message.author);
      break;

    case EXAM_COMMAND:
      const role = message.content.substring(message.content.indexOf(" ") + 1, message.content.length);
      const roleId = findRoleId(cacheRoles, role);
      cacheRoles.get(roleId).members.map(member => {
        const name = `${EXAM_CHANNEL_PREFIX}${sanitizeUsername(member.displayName)}`;
        const memberPermissions = [
          ...newChannelPermissions, 
          {
            id: member.id,
            allow: ['VIEW_CHANNEL'],
          }
        ];

        channels.create(name, {
          type: 'category',
          permissionOverwrites: memberPermissions
        }).then(channel => {
          channels.create(name, {
            type: 'voice',
            permissionOverwrites: memberPermissions
          }).then(voiceChannel => {
            voiceChannel.setParent(channel.id);
          });
        });
      });
      break;

    case EXAM_END_COMMAND:
      channelsList.forEach(channel => {
        if (channel.name.startsWith(EXAM_CHANNEL_PREFIX) && (channel.type === 'voice' || channel.type === 'category')) {
          channel.delete().catch(() => {});
        }
      });
      break;

    case TICKET_COMMAND:
      if (queue.length > 0) {
        const user = queue.shift();
        newChannelPermissions.push({
          id: user.id,
          allow: ['VIEW_CHANNEL'],
        });

        const name = `ticket-${sanitizeUsername(user.username)}`;
        const existing = existingChannel(channelsList, name);
        if (existing && !equalChannelNames(existing.parent.name, ARCHIVE_CHANNEL)) {
          embedUser(user, existing, message.author);
        } else {
          channels.create(name, {
            type: 'category',
            permissionOverwrites: newChannelPermissions
          }).then(channel => {
            if (existing && equalChannelNames(existing.parent.name, ARCHIVE_CHANNEL)) {
              existing.overwritePermissions(newChannelPermissions);
              embedUser(user, existing, message.author);
              existing.setParent(channel.id);
            } else {
              channels.create(name, {
                type: 'text',
                permissionOverwrites: newChannelPermissions
              }).then(textChannel => {
                textChannel.setParent(channel.id);
                embedUser(user, textChannel, message.author);
              });
            }

            channels.create(name, {
              type: 'voice',
              permissionOverwrites: newChannelPermissions
            }).then(voiceChannel => {
              voiceChannel.setParent(channel.id);
            });
          });
        }
      }
      break;

    case CLEAR_COMMAND:
      queue = [];
      break;

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
  if (reaction.message.channel.name === QUEUE_CHANNEL && !user.bot) {
    const serverId = reaction.message.guild.id;
    const queue = serverId in globalQueue ? globalQueue[serverId] : [];

    globalQueue[serverId] = !queue.includes(user) ? 
        updateQueue(user, reaction, queue, true) : updateQueue(user, reaction, queue, false);
  }
}

function updateQueue(user, reaction, queue, isPush) {
  isPush ? queue.push(user) : queue.splice(queue.indexOf(user), 1);
  addReactions(reaction.message.channel, queue);
  return queue;
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

function existingChannel(channels, name) {
  for (channelMap of channels) {
    const channel = channelMap[1];
    if (equalChannelNames(channel.name, name) && channel.type === 'text') {
      return channel;
    }
  }
}

function queueCommands() {
  return QUEUE_COMMAND + ": shows panel to enable queueing and to view current line\n" +
    NEXT_COMMAND + ": removes next person in the queue\n" +
    CLEAR_COMMAND + ": clears queue";
}

function ticketCommands() {
  return TICKET_COMMAND + ": removes next person in queue and creates a ticket\n" +
    CLOSE_COMMAND + ": closes ticket";
}

function sanitizeUsername(name) {
  return name.replace(/\W/g, '').toLowerCase();
}

function equalChannelNames(first, second) {
  return first.toLowerCase() === second.toLowerCase();
}

function findRoleId(roles, name) {
  return roles.find(role => role.name === name).id;
}

function findAllRoles(roles) {
  return {
    [EVERYONE]: findRoleId(roles, EVERYONE),
    [MOD]: findRoleId(roles, MOD),
    [BOT]: findRoleId(roles, BOT)
  }
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

function embedHelp() {
  return new Discord.MessageEmbed()
	.setColor(EMBED_COLOR)
	.setTitle('COMMANDS')
	.setDescription(`Here are all the commands you can use if you have a ${MOD} role`)
	.addFields(
		{ name: LINE + '\nGeneral\n' + LINE, value: "!help: shows all commands for this bot"},
		{ name: LINE + '\nQueue\n' + LINE, value: queueCommands()},
		{ name: LINE + '\nTicketing\n' + LINE, value: ticketCommands()},
	)
}

function embedUser(user, channel, messager) {
  channel.send(`@${user.username} Welcome! Please describe your question or issue. @${messager.username} is here to help you!`);
}

function embedNext(user, channel, messager) {
  channel.send(`${user.username} is being helped by ${messager.username}.`);
}
