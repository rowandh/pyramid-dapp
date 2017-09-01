import { Component, HostListener, NgZone } from '@angular/core';
const Web3 = require('web3');
const contract = require('truffle-contract');
const pyramidContract = require('../../build/contracts/Pyramid.json');
import { canBeNumber } from '../util/validation';

declare var window: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  Pyramid = contract(pyramidContract);

  // TODO add proper types these variables
  account: any;
  accounts: any;
  web3: any;
  owner: any;

  balance: number;
  sendingAmount: number;
  recipientAddress: string;
  status: string;
  canBeNumber = canBeNumber;

  constructor(private _ngZone: NgZone) {

  }

  @HostListener('window:load')
  windowLoaded() {
    this.checkAndInstantiateWeb3();
    this.onReady();
  }

  checkAndInstantiateWeb3 = () => {
    // Checking if Web3 has been injected by the browser (Mist/MetaMask)
    if (typeof window.web3 !== 'undefined') {
      console.warn(
        'Using web3 detected from external source'
      );
      // Use Mist/MetaMask's provider
      this.web3 = new Web3(window.web3.currentProvider);
    } else {
      console.warn(
        'No web3 detected. Falling back to http://localhost:8545. You should remove this fallback when you deploy live, as it\'s inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask'
      );
      // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
      this.web3 = new Web3(
        new Web3.providers.HttpProvider('http://localhost:8545')
      );
    }
  };

  onReady = () => {    
    this.Pyramid.setProvider(this.web3.currentProvider);

    // Get the initial account balance so it can be displayed.
    this.web3.eth.getAccounts((err, accs) => {
      if (err != null) {
        alert('There was an error fetching your accounts.');
        return;
      }

      if (accs.length === 0) {
        alert(
          'Couldn\'t get any accounts! Make sure your Ethereum client is configured correctly.'
        );
        return;
      }
      this.accounts = accs;
      this.account = this.accounts[1];

      // This is run from window:load and ZoneJS is not aware of it we
      // need to use _ngZone.run() so that the UI updates on promise resolution
      this._ngZone.run(() => {
        this.refreshBalance();
        this.getOwner();        
      });
    });
  };

  changeRecipient(address) {
    this.recipientAddress = address;
  }

  getOwner = () => {
    this.Pyramid
      .deployed()
      .then(instance => {
        return instance.owner.call();
      })
      .then(owner => {
        this.owner = owner;
        this.recipientAddress = owner;
      })
      .catch(e => {
        console.log(e);
        this.setStatus("Error getting owner");
      });
  }

  refreshBalance = () => {
    this.Pyramid
      .deployed()
      .then(instance => {
        return instance.getReferreeCount.call(this.account);
      })
      .then(value => {
        this.balance = value;
      })
      .catch(e => {
        console.log(e);
        this.setStatus('Error getting balance; see log.');
      });
  };

  setStatus = message => {
    this.status = message;
  };

  contribute = () => {
    const receiver = this.recipientAddress;
    let instance;
    this.Pyramid
      .deployed()
      .then(i => {
        instance = i;
        return instance.isPaidOut.call(this.account);
      })
      .then(isPaidOut => {
        if (isPaidOut) {
          this.setStatus("You've already been paid out");
          return;
        }
        return instance.hasContributed.call(this.account);
      })
      .then(hasContributed => {
        if (hasContributed) {
          this.setStatus("You have already contributed");
          return;
        }
        return instance.contribute(receiver, {
          from: this.account,
          value: this.web3.toWei(1, "ether")
        });
      })
      .then(txHash => {
        this.setStatus("Contribution received");
        this.refreshBalance();
      })
      .catch(e => {
        console.log(e);
        this.setStatus("Error contributing");
      });
  }
}
