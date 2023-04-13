module.exports = [
    {
        title: 'Beta Tester',
        icon: '<:BetaTester:1095992512071602196>',
        description: 'Play the game while it was in beta in the Discord server, no longer obtainable.',
        cost: (data) => {
            return data?.betaTester === true
        }
    },
    {
        title: '100 Streaks',
        icon: '<:100Streak:1095995033200631939>',
        description: 'Surpass the 100 continous streaks!',
        cost: (data) => {
            return data?.highestStreak >= 100;
        }
    }
]