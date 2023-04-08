require('dotenv').config();

const { Client, ApplicationCommandTypes, InteractionTypes, ApplicationCommandOptionTypes, ComponentTypes, ComponentInteraction } = require('oceanic.js');
const { InteractionCollector } = require('oceanic-collectors');

const draw = require('./index');
const Helper = require('./Database');
const package = require('./package.json');

const client = new Client({ auth: process.env.TOKEN });
const helper = new Helper({ collection: 'memory' });

const footer = { text: `SpotAI v${package.version}`, iconURL: 'https://cdn.discordapp.com/attachments/945308137932599348/1094162158348148797/logo.png' };

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
				return `\`${i + 1}.\` ${el.score.toLocaleString()} \\🏆 - ${user.username}`;

			}));

			interaction.createFollowup({
				embeds: [{
					title: 'Leaderboard 🌍',
					description: formatted.join('\n'),
					footer: footer,
				}],
			});
		}
		if (interaction.data.name === 'help') {
			interaction.createFollowup({
				"embeds": [
					{
					  "title": `Help`,
					  "description": `**Commands**\n\n\`/spotai\` - Start the game\n\`/leaderboard\` - See who leads globally\n\`/help\`- What you are currently reading.\n**Misc**\n\nMade by \`Face#0981\`, [YouTube here](https://youtube.com/facedevstuff).\n\nMade with [Oceanic](https://oceanic.ws/).\n\nSupport server [here](https://discord.gg/W98yWga6YK), you can also contribute to the bot by submitting images!\n\nBase code made in **2 days** :)`,
					  "color": 0x00FFFF
					}
				  ],
			});
		}
		if (interaction.data.name === 'spotai') {

			const level = interaction.data.options.getString('level', false);
			const image = await draw([level] || undefined);
			const ids = [String(Math.random()), String(Math.random())];
			const embed = {
				image: {
					url: 'attachment://SpotAI_FaceDev.png',
				},
				footer: footer,
			};

			await interaction.createFollowup({
				embeds: [embed],
				files: [{ 'name': 'SpotAI_FaceDev.png', 'contents': image.buffer }],
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
			});

			const collector = new InteractionCollector(client, {
				time: 60000,
				filter: (button) => button.member.id === interaction.member.id,
			});

			collector.on('end', (_, reason) => {
				if (reason === 'time') {
					interaction.editOriginal({ content: 'Timed out after 60s!', components: [] });
				}
			});
			collector.on('collect', async (btn) => {
				if (!(btn instanceof ComponentInteraction)) return;
				if (!ids.includes(btn.data.customID)) return;

				const scoreToInc = parseInt(image.level);
				const isAI = image.IS_AI;
				const chosenOption = ids.indexOf(btn.data.customID);
				const won = isAI === chosenOption;
				const color = won ? 0x00ff00 : 0xff0000;
				const score = won ? scoreToInc : -scoreToInc;

				await helper.db_increase({ id: interaction.member.id, data: { score: score } });

				const data = await helper.db_fetch({ id: interaction.member.id });

				const content = '```' +
                `TROPHIES   - ${data.score || 0} 🏆\n` +
                `GOT        - ${score < 0 ? score : `+${score}`} 🏆\n` +
                `WHICH      - The image #${image.IS_AI + 1} is AI-generated.\n` +
                `PROMPT     - ${image.prompt}\n` +
                '```';

				await btn.deferUpdate();
				await btn.editOriginal({ embeds: [{ ...embed, color, description: content }], components: [] });

				return collector.stop('limit');
			});
		}
	}
	}
});
client.on('error', (err) => {
	console.error('Something broke', err);
});

client.connect();