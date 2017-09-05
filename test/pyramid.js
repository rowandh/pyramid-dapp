const Pyramid = artifacts.require("./Pyramid.sol");
const expectedExceptionPromise = require('./expected_exception_testRPC_and_geth');

contract("Pyramid", (accounts) => {
    let instance;
    let account2 = accounts[1];

    let payoutTestAccount1 = accounts[2];
    let payoutTestAccount2 = accounts[3];

    // Make sure we use different accounts for each test
    let referrerAccount1 = accounts[4];
    let referrerAccount2 = accounts[5];

    let tryContributingToPaidOutReferrerAccount = accounts[6];
    
    let contributionAmount = web3.toWei(1, "ether");
    
    it("owner should have contributed", () => {
        return Pyramid.deployed().then(i => {
            instance = i
            return instance.owner.call();
        })
        .then(owner => {
            return instance.hasContributed.call(owner);
        })
        .then(contributed => {
            assert.isTrue(contributed);
        });
    });

    it("can't contribute if amount is less than or greater than 1 ether", () => {
        let owner;
        return Pyramid.deployed().then(i => {
            instance = i;
            return instance.owner.call();
        })
        .then(o => {
            owner = o;
            return owner;
        })
        .then(owner => {
            const val = web3.toWei(0.999, "ether");
            return expectedExceptionPromise(() => {
                return instance.contribute(owner, { from: account2, value: val });
            });
        })
        .then(() => {
            const val = web3.toWei(1.111, "ether");
            return expectedExceptionPromise(() => {
                return instance.contribute(owner, { from: account2, value: val });
            });
        });
    });

    it("can't contribute if referrer has not contributed", () => {
        let owner;
        return Pyramid.deployed().then(i => {
            instance = i;
            return instance;
        })
        .then(() => {
            return instance.hasContributed.call(referrerAccount1);
        })
        .then(hasAccount1Contributed => {
            assert.isFalse(hasAccount1Contributed);
        })
        .then(() => {
            return expectedExceptionPromise(() => {
                return instance.contribute(referrerAccount1, { from: referrerAccount2, value: contributionAmount });
            });
        });
    });

    it("can contribute if referrer has contributed", () => {
        let owner;
        return Pyramid.deployed().then(i => {
            instance = i;
            return instance.owner.call();
        })
        .then(o => {
            owner = o;
            return o;
        })
        .then(() => {
            return instance.contribute(owner, { from: referrerAccount1, value: contributionAmount });
        })
        .then(() => {
            return instance.hasContributed.call(referrerAccount1);
        })
        .then(hasAccount1Contributed => {
            assert.isTrue(hasAccount1Contributed);
        });
    });   
    
    // This test could be improved because it currently depends on the other tests running first,
    // but otherwise the state is a nightmare to set up...    
    it("can't contribute twice", () => {
        let owner;
        return Pyramid.deployed().then(i => {
            instance = i;
            return instance;
        })
        .then(() => {
            return expectedExceptionPromise(() => {                
                return instance.contribute(owner, { from: referrerAccount1, value: contributionAmount });
            });
        });
    });

    it("should payout referrer after 2 referral contributions", () => {
        let accountHasContributed = referrerAccount1;
        let startingBalance;
        let endingBalance;
        return Pyramid.deployed().then(i => {
            instance = i;
            return web3.eth.getBalance(accountHasContributed);
        })
        .then(balance => {
            startingBalance = balance;
        })
        .then(() => {
            return instance.getRefereeCount.call(accountHasContributed);
        })
        .then(refereeCount => {
            assert.isTrue(refereeCount == 0);
        })
        .then(() => {
            return instance.contribute(accountHasContributed, { from: payoutTestAccount1, value: contributionAmount });
        })
        .then(() => {
            return instance.contribute(accountHasContributed, { from: payoutTestAccount2, value: contributionAmount });
        })        
        .then(() => {
            return instance.isPaidOut.call(accountHasContributed);
        })
        .then(isPaidOut => {
            assert.isTrue(isPaidOut);
            return web3.eth.getBalance(accountHasContributed);
        })
        .then(balance => {
            endingBalance = balance;
        })
        .then(() => {
            const diff = endingBalance - startingBalance;
            assert.equal(web3.toWei(2, "ether"), diff.toString('10'));
        })
    });    

    // Another dodgy test because it also depends on the results of previous tests,
    // but again the state is a nightmare to set up
    // By this stage the owner should have had two contributions already
    it("can't contribute to a paid out referrer", () => {
        let paidOutAccount = referrerAccount1;
        return Pyramid.deployed().then(i => {
            instance = i;
        })
        .then(() => {
            return instance.isPaidOut.call(paidOutAccount);
        })
        .then(isPaidOut => {
            assert.isTrue(isPaidOut);
        })
        .then(() => {
            return expectedExceptionPromise(() => {
                return instance.contribute(paidOutAccount, {from: tryContributingToPaidOutReferrerAccount, value: contributionAmount });
            });
        });
    });    
});