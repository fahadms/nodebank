var express = require('express');
var http = require('http'), EventEmitter = require('events').EventEmitter;
var cache = {};
const {getDBConnection} = require("./helpers");

module.exports = (function () {

    var router = express.Router();
    var Sequelize = require('sequelize');
//    var config = require('./config');
//
//    //Initialize database
//    var sequelize = new Sequelize(config.database, config.username, config.password);
//
//
//    var TABLE_PREFIX = config.table_prefix;
//
//    //Pagination settings
//    var paginate = config.paginate;
//    var page_limit = config.page_limit;
//
//    var mysql_clean = function (string) {
//        return sequelize.getQueryInterface().escape(string);
//    };

    //Create Account with/without opening balance
    router.post('/balances', async function createBalance(req, res, next) {
        const openingBalance = req.body.balance || 0;
        const connection = await getDBConnection();
        const [result] = await connection.execute('insert into balances (balance) values (?)', [openingBalance]);
        return res.status(200).json({"success": true, "id": result.insertId})
    });
    // Get balance from particular account
    router.get('/balances/:id', async function getBalance(req, res, next) {
        const accountNumber = req.params.id;
//        console.log('acc num in get balance:'+accountNumber);
        if (!accountNumber) {
            return res.json(400).json({"error": "Account Number is required"})
        }
        try {
            const connection = await getDBConnection();
            let [[row]] = await connection.execute('select * from balances where account_nr = ? LOCK IN SHARE MODE', [accountNumber]);
//            console.log(row);
            return res.status(200).json(row)
        } catch (err) {
            return res.status(500)
        }
    });


    // Create the transfer 
    router.post('/transfer', async function createTransaction(req, res, next) {

        req.connection.setTimeout( 1000 * 60 * 10 );
        const from = req.body.from;
        const to = req.body.to;
        const amount = req.body.amount;


        if (!from || !to) {
            return res.status(400).json({
                "success": false,
                "error": "Please provide To and From account numbers"
            })
        }

        if (from === to) {
            return res.status(403).json({
                "success": false,
                "error": "From and To account must be different"
            })
        }


        if (!amount || amount < 0) {
            return res.status(400).json({"success": false, "error": "Transfer amount cannot be negative or 0"})
        }

        var key = from + to;
        cached = cache[key]; // get some unique request identifier
        if (!cached) { // if we've never seen this request before, to avoid  concurrent overlapping requests.
            cached = new EventEmitter(); // make this cache entry an event emitter
            cached.status = 'running';

            // TODO prevent duplicate requests
            const connection = await getDBConnection();
            try {

                await connection.beginTransaction();
                let [[sourceBalance]] = await connection.execute('Select account_nr, balance FROM balances WHERE account_nr = ? FOR UPDATE', [from]);
                let [[destBalance]] = await connection.execute('Select account_nr, balance FROM balances WHERE account_nr = ? FOR UPDATE', [to]);
                if (!sourceBalance || !destBalance) {
                    await connection.rollback();
                    return res.status(404).json({
                        "success": false,
                        "error": "To/From is not a valid bank account number"
                    })
                }

                if (sourceBalance.balance < amount) {
                    await connection.rollback();
                    return res.status(403).json({"success": false, "error": "From account has insufficient amount"})
                }

                await connection.execute('update balances set balance = balance - ?  where account_nr = ?', [amount, from]);
                await connection.execute('update balances set balance = balance + ?  where account_nr = ?', [amount, to]);
                let [transFrom] = await connection.execute('insert into transactions (amount, account_nr) values ( ?, ?)', [-amount, from]);
                let [transTo] = await connection.execute('insert into transactions (amount, account_nr) values ( ?, ?)', [amount, to]);
                await connection.commit();
//            return res.status(200).json({"success": true, "tr":[[sourceBalance]]})
                return res.status(200).json({'id': transFrom.insertId, 'sub_id': transTo.insertId, 'from': {'id': from, 'balance': sourceBalance.balance - amount}, 'to': {'id': to, 'balance': destBalance.balance + amount}, 'transfered': amount})

            } catch (err) {
                await connection.rollback();
                return res.status(500).json({"success": false, "error": err})
            }

//            cached.response = result; // memoize data
            cached.status = 'finished';
            cached.emit('finished'); // notify all observers waiting for this request
        } else {
            switch (cached.status) { // if existing request, check if it's still running or finished
                case 'finished':
                    res.end(cached.response); // send cached response immediately if request has finished
                    break;
                case 'running':
                    // subscribe as observer; send response when request is finished
                    cached.once('finished', function () {
                        res.end(cached.response);
                    });
                    break;
            }
        }

    });
    return router;
})();