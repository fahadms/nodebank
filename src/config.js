var config = {};

config.port = 3000;

//Authentication
config.auth = false;

//Database
config.database = 'nodebank';
config.username = 'root';
config.password = 'root';
config.host = 'localhost';
config.table_prefix = '';

//Pagination
config.paginate = false;
config.page_limit = 10;

module.exports = config;