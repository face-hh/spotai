require('dotenv').config();

const { Client, ApplicationCommandTypes, InteractionTypes, ApplicationCommandOptionTypes, ComponentTypes, ComponentInteraction } = require('oceanic.js');
const { InteractionCollector } = require('oceanic-collectors');

const draw = require('./index');
const Helper = require('./Database');
const package = require('./package.json');

const client = new Client({ auth: process.env.TOKEN });
const helper = new Helper({ collection: 'memory' });

const footer = { text: `SpotAI v${package.version}`, iconURL: 'https://cdn.discordapp.com/attachments/945308137932599348/1094162158348148797/logo.png' };
const trophyEmoji = '<:trophy:1094520327071076402>';
const lightningboltEmoji = '<:lightningbolt:1094527157172183115>';

const timers = {};

function startTimer(collector, id) {
  if (timers[id]) clearTimeout(timers[id]);

  timers[id] = setTimeout(() => {
    collector.stop('time');
  }, 60000);
}


client.on('ready', async () => {
	console.log('Ready as', client.user.tag);

	await client.application.bulkEditGlobalCommands([
		{
			type: ApplicationCommandTypes.CHAT_INPUT,
			name: 'spotai',
			description: 'Play SpotAI, where you have to guess which image is AI generated.',
			options: [
				{
					type: ApplicationCommandOptionTypes.STRING,
					name: 'level',
					description: 'Which level you want to play?',
					choices: [
						{ name: 'Level 1 - Easy to spot', value: '1' },
						{ name: 'Level 2 - Almost easy to spot', value: '2' },
						{ name: 'Level 3 - Medium to spot', value: '3' },
						{ name: 'Level 4 - Hard to spot', value: '4' },
						{ name: 'Level 5 - Impossible to spot (the AI image is a variantion of the original)', value: '5' },
					],
				},
			],
		},
		{
			type: ApplicationCommandTypes.CHAT_INPUT,
			name: 'profile',
			description: 'Check out analytics about yourself, flex them on others, or feel inferior by checking others\' profiles!',
			options: [
				{
					type: ApplicationCommandOptionTypes.USER,
					name: 'player',
					description: 'The player that you want to get the data of.',
				},
			],
		},
		{
			type: ApplicationCommandTypes.CHAT_INPUT,
			name: 'leaderboard',
			description: 'See the SpotAI leaderboard.',
		},
		{
			type: ApplicationCommandTypes.CHAT_INPUT,
			name: 'help',
			description: 'Information about how the game was made!',
		},
	]);
});

client.on('interactionCreate', async (interaction) => {
	switch (interaction.type) {

	case InteractionTypes.APPLICATION_COMMAND: {
		await interaction.defer();

		if (interaction.data.name === 'leaderboard') {
			const leaderboard = await helper.db_leaderboard();

			const formatted = await Promise.all(leaderboard.map(async (el, i) => {

				const user = await client.rest.users.get(el.id);
				return `\`${i + 1}.\` ${el.score.toLocaleString()} ${trophyEmoji} - ${user.username}`;

			}));

			interaction.createFollowup({
				embeds: [{
					title: 'Leaderboard 🌍',
					description: formatted.join('\n'),
					footer: footer,
				}],
			});
		}
		if (interaction.data.name === 'profile') {
			const user = interaction.data.options.getUser("player", false) || interaction.user;
			const data = await helper.db_fetch({ id: user.id });

			interaction.createFollowup({
				embeds: [{
					thumbnail: { url: user.avatarURL('png') },
					title: user.tag,
					url: 'https://youtube.com/facedevstuff',
					fields: [
						{
							name: 'Trophies',
							value: `${trophyEmoji} ${data.score.toLocaleString()}`,
							inline: true
						},
						{
							name: 'Highest streak',
							value: `${lightningboltEmoji} ${data.highestStreak}`,
							inline: true
						},
						{
							name: 'Games',
							value: `\`Won\`: ${data.gamesWon.toLocaleString()}\n\`Lost\`: ${data.gamesLost.toLocaleString()}\n\`Total\`: ${data.gamesPlayed.toLocaleString()}`,
							inline: true
						},
					],
					description: ``,
					footer: footer,
				}],
			});
		}
		if (interaction.data.name === 'help') {
			interaction.createFollowup({
				"embeds": [
					{
					  "title": `Help`,
					  "description": `**Commands**\n\n\`/spotai\` - Start the game\n\`/leaderboard\` - See who leads globally\n\`/help\`- What you are currently reading.\n\n**Misc**\n\nMade by \`Face#0981\`, [YouTube here](https://youtube.com/facedevstuff).\n\nMade with [Oceanic](https://oceanic.ws/).\n\nSupport server [here](https://discord.gg/W98yWga6YK), you can also contribute to the bot by submitting images!\n\nBase code made in **2 days** :)`,
					  "color": 0x00FFFF
					}
				  ],
			});
		}
		if (interaction.data.name === 'spotai') {

			const level = interaction.data.options.getString('level', false);
			let image = await draw([level] || undefined);
			const ids = [String(Math.random()), String(Math.random()), String(Math.random())];
			const embed = {
				image: {
					url: 'attachment://SpotAI_FaceDev.png',
				},
				footer: footer,
			};
			let file = [{ 'name': 'SpotAI_FaceDev.png', 'contents': image.buffer }];
			const startingEmbed = {
				embeds: [embed],
				files: file,
				components: [
					{
						type: ComponentTypes.ACTION_ROW, components: [
							{
								type: ComponentTypes.BUTTON,
								style: 1,
								label: '1',
								customID: ids[0],
							},
							{
								type: ComponentTypes.BUTTON,
								style: 4,
								label: '2',
								customID: ids[1],
							},
						],
					},
				],
			};

			await interaction.createFollowup(startingEmbed);

			const resetComponents = [
				{
					type: ComponentTypes.ACTION_ROW, components: [
						{
							type: ComponentTypes.BUTTON,
							style: 2,
							emoji: { name: '🔄' },
							customID: ids[2],
						},
					],
				},
			];

			const collector = new InteractionCollector(client, {
				filter: (button) => button.member.id === interaction.member.id,
			});

			startTimer(collector, ids[2]);

			collector.on('end', (_, reason) => {
				if (reason === 'time') {
					interaction.editOriginal({ content: 'Timed out after 60s!', components: [] });
				}
			});
			collector.on('collect', async (btn) => {
				if (!(btn instanceof ComponentInteraction)) return;
				if (!ids.includes(btn.data.customID)) return;

				startTimer(collector, ids[2]);

				/** RESTART BUTTON */
				if(btn.data.customID === ids[2]){
					await btn.deferUpdate();

					image = await draw([level] || undefined);

					file[0].contents = image.buffer;
					startingEmbed.files = file;

					await interaction.editOriginal(startingEmbed)

					startTimer(collector, ids[2]);
					return;
				}
				const scoreToInc = parseInt(image.level);
				const isAI = image.IS_AI;
				const chosenOption = ids.indexOf(btn.data.customID);
				const won = isAI === chosenOption;
				const color = won ? 0x00ff00 : 0xff0000;
				const score = won ? scoreToInc : -scoreToInc;

				const data = await helper.db_fetch({ id: interaction.member.id });

				const currentScore = data.score + score;
				const streak = won ? data.streak + 1 : 0;
				const highestStreak = data.highestStreak > streak ? data.highestStreak : streak;

				await helper.db_increase({ id: interaction.member.id, data: {
					$set: {
						score: currentScore,
						streak,
						highestStreak
					},
					$inc: { gamesPlayed: 1, [`games${won ? 'Won' : 'Lost'}`]: 1 }
				} });

				const content = `**${trophyEmoji} ${currentScore.toLocaleString()}** (${score < 0 ? score : `+${score}`} ${trophyEmoji})\n` +
				`${lightningboltEmoji} Streak: **${streak}**.\n` +
                `The #${image.IS_AI + 1} image is AI-generated.\n` +
                `\`${image.prompt}\``;

				await btn.deferUpdate();
				await btn.editOriginal({ embeds: [{ ...embed, color, description: content }], components: resetComponents });
			});
		}
	}
	}
});
client.on('error', (err) => {
	console.error('Something broke', err);
});

client.connect();