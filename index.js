const fs = require('fs');
const Discord = require('discord.js');
const { prefix, token } = require('./config.json');

const client = new Discord.Client();
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}

const cooldowns = new Discord.Collection();

client.once("ready", () =>{
    console.log(`Logged in as ${client.user.tag}!`);
    client.channels.cache.find(channel => channel.name === "spam-test-channel").send("bot is online")
    
    client.user.setPresence({
        activity: {
            name: 'patreon.com/futnchill',
            type: 'PLAYING',
            url: 'https://www.patreon.com/futnchill'
        }
    });
});

client.on('message', message => {
	if (!message.content.startsWith(prefix) || message.author.bot) return;

	const args = message.content.slice(prefix.length).trim().split(/ +/);
	const commandName = args.shift().toLowerCase();

	const command = client.commands.get(commandName)
		|| client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

	if (!command) return;

	if (command.guildOnly && message.channel.type === 'dm') {
		return message.reply('I can\'t execute that command inside DMs!');
	}

	if (command.permissions) {
		const authorPerms = message.channel.permissionsFor(message.author);
		if (!authorPerms || !authorPerms.has(command.permissions)) {
			return message.channel.reply('You can not do this!');
		}
	}

	if (command.args && !args.length) {
		let reply = `You didn't provide any arguments, ${message.author}!`;

		if (command.usage) {
			reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
		}

		return message.channel.send(reply);
	}

	if (!cooldowns.has(command.name)) {
		cooldowns.set(command.name, new Discord.Collection());
	}

	const now = Date.now();
	const timestamps = cooldowns.get(command.name);
	const cooldownAmount = (command.cooldown || 3) * 1000;

	if (timestamps.has(message.author.id)) {
		const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

		if (now < expirationTime) {
			const timeLeft = (expirationTime - now) / 1000;
			return message.reply(`please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`);
		}
	}

	timestamps.set(message.author.id, now);
	setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

	try {
		command.execute(client, message, args);
	} catch (error) {
		console.error(error);
		message.reply('there was an error trying to execute that command!');
	}
});
client.on("message", (message) => {
       if (message.channel.type === "dm"){
          var respone = `message ${message.id} is sent in dms with ${message.channel}\nMessage from: ${message.author.username}\n **Message: **${message.content}`;
var embed = new Discord.MessageEmbed()
.setAuthor(`${message.id} ${message.author.tag}`) 
.setDescription(respone)
.setTimestamp()
.setColor("#FF0000");
           client.channels.cache.find(channel => channel.name === "dmlogs").send(embed)
       }
});

client.on('messageDelete', async (message) => {
        try {
            const logs = client.channels.cache.find(channel => channel.name === "botlogs");
            if (message.guild.me.hasPermission('MANAGE_CHANNELS') && !logs) {
                await message.guild.createChannel('logs', 'text');
            }
            if (!message.guild.me.hasPermission('MANAGE_CHANNELS') && !logs) {
                return console.log('I don\'t have permissions and the event was cannceled');
            }
            const entry = await message.guild.fetchAuditLogs({
                type: 'MESSAGE_DELETE'
            }).then(audit => audit.entries.first())
            let user;
            if (entry.extra.channel.id === message.channel.id && (entry.target.id === message.author.id) && (entry.createdTimestamp > (Date.now() - 5000)) && (entry.extra.count >= 1)) {
                user = entry.executor.username
            } else {
                user = message.author
            }
            const Discord = require("discord.js");
            const logembed = new Discord.MessageEmbed()
                .setTitle('Message Deleted')
                .setAuthor(message.author.username + message.author.id, message.author.displayAvatarURL)
                .addField(`**Message sent by ${message.author.username}> deleted in ${message.channel.name}**\n\n`, `\`\`\`fix\n${message.content}\`\`\``, false)
                .setColor("#FF0000")
                .addField("Channel Message Was deleted in", `<#${message.channel.id}>`, false)
                .setFooter("FUT AND CHILL", message.guild.iconURL)
                .setTimestamp(new Date())
            // console.log(entry)
            logs.send(logembed);
        } catch (err) {
            console.log(err)
        }
    })
client.on("messageUpdate", async (oldMessage, newMessage) => {
        if (oldMessage.author.bot) {
            return;
        }
        let logs = oldMessage.client.channels.cache.find(channel => channel.name === "botlogs");
        if (oldMessage.guild.me.hasPermission('MANAGE_CHANNELS') && !logs) {
            await oldMessage.guild.createChannel('logs', 'text');
        }
        if (!oldMessage.guild.me.hasPermission('MANAGE_CHANNELS') && !logs) {
            return console.log('The logs channel does not exist and cannot be created')
        };
        const Discord = require("discord.js");
        logs.send({
            embed: new Discord.MessageEmbed()
                .setTitle("Edited Message")
                .setColor("ffa500")
                .setTimestamp(new Date())
                .addField("Message Author", '\u200B' + oldMessage.author.tag)
                .addField("OldMessage Content", `\u200B${oldMessage.content}`)
                .addField("New Message Content", `\u200B${newMessage.content}`)
                .addField("channel", '\u200B' + `${oldMessage.channel}`)
        }).catch(console.error)
    })
client.login(token);