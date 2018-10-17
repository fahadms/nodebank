const chai = require('chai');
const chaiHttp = require('chai-http');
const {app} = require('../server');
const config = require('../src/config');
chai.use(require('chai-json'));

var expect = chai.expect;

let should = chai.should();

chai.use(chaiHttp);

function transaction(amount, from, to) {
    return chai.request(app)
            .post('/api/transfer/')
            .send({"from": from, "to": to, "amount": amount})
}

function balance(accountNr) {
    return chai.request(app)
            .get(`/api/balances/${accountNr}`)
}

describe('Concurrent transaction', async function () {
    describe('Consistent values', () => {
        it('should make multiple transfer transactions and return 200 for everyone, giving the right balances', async () => {

            // Create new Account b1
            const b1 = await chai.request(app)
                    .post('/api/balances/')
                    .send({'balance': 5000});
//            console.log(b1);

            b1.body.should.have.property('success');

            // Create new Account b2
            const b2 = await chai.request(app)
                    .post('/api/balances/')
                    .send({'balance': 5000});

            b2.body.should.have.property('success');

            // Create new Account b3
            const b3 = await chai.request(app)
                    .post('/api/balances/')
                    .send({'balance': 0});

            b3.body.should.have.property('success');

// Get newly created account numbers
            const accountA = b1.body.id;
            const accountB = b2.body.id;
            const accountC = b3.body.id;
            
//            console.log('accA:' + accountA);
// Create multiple transfers in Promise 
            let concurrent_requests = Promise.all([
                transaction(500, accountA, accountC),
                transaction(2000, accountB, accountC),
                transaction(1000, accountA, accountC),
                transaction(200, accountB, accountC),
                transaction(2000, accountA, accountC),
                transaction(1000, accountB, accountC),
                transaction(350, accountA, accountC),
                transaction(300, accountB, accountC),
                transaction(1150, accountA, accountC),
                transaction(1500, accountB, accountC),
            ]);

            await concurrent_requests;

// Get the current balances of the newly created accounts after the transferers
            const balanceA = await chai.request(app)
                    .get(`/api/balances/${accountA}`);
            const balanceB = await chai.request(app)
                    .get(`/api/balances/${accountB}`);
            const balanceC = await chai.request(app)
                    .get(`/api/balances/${accountC}`);
            
            // The balaces of the Account should be equal to below after the transfers in Promise
            expect(balanceA.body).to.deep.equal({'account_nr': accountA, 'balance': 0});
            expect(balanceB.body).to.deep.equal({'account_nr': accountB, 'balance': 0});
            expect(balanceC.body).to.deep.equal({'account_nr': accountC, 'balance': 10000});
        });
    });


    describe('Deadlocking', () => {
        it('should  not get deadlocked', async () => {

 // Create new Account b1
            const b1 = await chai.request(app)
                    .post('/api/balances/')
                    .send({'balance': 1500});

            b1.body.should.have.property('id');


 // Create new Account b2
            const b2 = await chai.request(app)
                    .post('/api/balances/')
                    .send({'balance': 1500});

            b2.body.should.have.property('id');

 // Create new Account b3
            const b3 = await chai.request(app)
                    .post('/api/balances/')
                    .send({'balance': 1500});

            b3.body.should.have.property('id');

 // Create new Account b4
            const b4 = await chai.request(app)
                    .post('/api/balances/')
                    .send({'balance': 1500});

            b4.body.should.have.property('id');

// Get newly created account numbers
            const accountA = b1.body.id;
            const accountB = b2.body.id;
            const accountC = b3.body.id;
            const accountD = b4.body.id;

// Run multiple rest calls. It should execute without deadlock
            let concurrent_requests = Promise.all([
                balance(accountA),
                transaction(500, accountA, accountB),
                balance(accountB),
                transaction(400, accountB, accountC),
                balance(accountC),
                transaction(100, accountC, accountA),
                balance(accountD),
                transaction(500, accountA, accountC),
                transaction(200, accountB, accountA),
                transaction(200, accountA, accountB),
                transaction(150, accountB, accountC),
                transaction(300, accountC, accountD),
                transaction(550, accountD, accountA),
                transaction(100, accountB, accountD),
            ]);

            await concurrent_requests;

        });
    });

});
