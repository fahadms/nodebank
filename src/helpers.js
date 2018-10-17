//const mysql = require('mysql/index');
const mysql2 = require('mysql2/promise');
var config = require('./config');
async function getDBConnection() {
    try {
        return await mysql2.createConnection({
            host: config.host,
            user: config.username,
            password: config.password,
            database: config.database
        });

    } catch (e) {
        console.warn(e)
    }
}

module.exports = {getDBConnection};

