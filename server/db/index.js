const {createJsonRepositories} = require('./json');

const drivers = {
    json: createJsonRepositories,
    // postgres: require('./postgres').createPostgresRepositories,
    // mongo: require('./mongo').createMongoRepositories,
};

function createRepositories(dbConfig) {
    const factory = drivers[dbConfig.driver];
    if (!factory) throw new Error(`Unknown DB_DRIVER "${dbConfig.driver}". Available: ${Object.keys(drivers).join(', ')}`);
    return factory(dbConfig);
}

module.exports = {createRepositories};
