const mongodb = require('mongodb');
const { MongoClient } = mongodb;
let client;

const newData = {
	streak: 0,
	score: 0,
	highestStreak: 0,
	gamesPlayed: 0,
	gamesWon: 0,
	gamesLost: 0,
	badges: [],
	betaTester: false,
};

module.exports = class State {
	constructor({ collection }) {
		if (!client) {
			client = new MongoClient(process.env.mongo_uri, { useNewUrlParser: true });
			client.connect((err) => {
				if (!err) console.log('Connected to MongoDB!');
			});
		}

		this.client = client;
		this.db = client.db('intern');
		this.collection = this.db.collection(collection);
	}

	/**
     * @param {Object} id The distinguishable ID of a certain data piece.
     */
	async db_update({ data, id }) {
		await this.collection.updateOne({ id: id }, { $set: data }, { upsert: true });

		return true;
	}

	/**
     * @param {Object} id The distinguishable ID of a certain data piece.
     */
	async db_increase({ data, id }) {
		await this.collection.updateOne({ id: id }, data, { upsert: true });

		return true;
	}

	/**
     * @param {Object} query The query that has to be matched.
     */
	async db_fetch(query) {
		const data = await this.collection.findOne(query);

		if (!data) {
			newData.id = query.id;
			await this.collection.insertOne(newData);

			delete newData['id']
			delete newData['_id']

			return newData;
		  }

		return data;
	}
	/**
     * @param {Object} query The query that has to be matched.
     */
	async db_remove(query) {
		await this.collection.deleteOne(query).catch(() => { return false; });

		return true;
	}
	/**
     * @param {Object} query The query that has to be matched.
     */
	async db_all(query) {
		const data = await this.collection.find(query).toArray();

		if (!data) return false;

		return data;
	}

	async db_keepup(){
		Object.entries(newData).forEach(async (el) => {

		await this.collection.updateMany({ [el[0]]: { $exists: false } }, {
			$set: {
				[el[0]]: el[1]
			}
		})
	})
	}
	async db_leaderboard() {
		const pipeline = [
			{ $sort: { score: -1 } },
			{ $limit: 10 },
			{ $group: { _id: null, data: { $push: '$$ROOT' } } },
			{
				$project: {
					data: {
						$map: {
							input: '$data',
							in: {
								$mergeObjects: [
									'$$this',
									{ rank: { $add: [ { $indexOfArray: [ '$data._id', '$$this._id' ] }, 1 ] } },
								],
							},
						},
					},
				},
			},
		];
		const data = await this.collection.aggregate(pipeline).toArray();

		if (!data) return false;

		return data[0].data;
	}
};