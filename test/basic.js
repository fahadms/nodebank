const chai = require('chai');
const chaiHttp = require('chai-http');
const {app} = require('../server');
const config = require('../src/config');

let should = chai.should();

chai.use(chaiHttp);

describe('API calls', function () {
    describe('POST /balances/', () => {
        it('should create an account and return status 200', async () => {
            // Create a new account 
            let res = await chai.request(app)
                    .post('/api/balances/')
                    .send({
                        "balance": "5000"
                    });

// The response must return 200
            res.should.have.status(200);
            res.body.should.be.a('object');
            // Must return a id and success should be true
            res.body.should.have.property('id');
            res.body.success.should.equal(true);
            res.body.should.have.property('success');
        });
    });

    describe('POST /transfer/', () => {
        it('should make a transfer and return 200', async () => {

// Create an account b1
            const b1 = await chai.request(app)
                    .post('/api/balances/')
                    .send({                        
                        "balance": "5000"
                    });
//            console.log(b1);
            b1.body.should.have.property('success');

// Create an account b2
            const b2 = await chai.request(app)
                    .post('/api/balances/')
                    .send({                      
                        "balance": "5000"
                    });

            b2.body.should.have.property('success');

// Get the newly created acc numbers
            const accountA = b1.body.id;
            const accountB = b2.body.id;

// Transfer amount 100 from accountA to accountB
            let res = await chai.request(app)
                    .post('/api/transfer/')
                    .send({"from": accountA, "to": accountB, "amount": 100});

// if success should return 200
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.should.have.property('id');
//
        });
    });
});
