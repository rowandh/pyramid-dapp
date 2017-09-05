import { Component, HostListener, NgZone } from '@angular/core';
const Web3 = require('web3');
const contract = require('truffle-contract');
const pyramidContract = require('../../build/contracts/Pyramid.json');
import { canBeNumber } from '../util/validation';
import { ActivatedRoute } from '@angular/router';
import { environment } from './../environments/environment';

declare var window: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  Pyramid = contract(pyramidContract);

  refereeAddress: string;
  account: any;
  accounts: any;
  web3: any;
  owner: any;
  lastContributions = [];
  hasContributed: boolean;

  balance: number;
  sendingAmount: number;
  recipientAddress: string;
  status: string;
  canBeNumber = canBeNumber;

  constructor(private _ngZone: NgZone, private route: ActivatedRoute) {
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
        new Web3.providers.HttpProvider(environment["endpoint"])
      );
    }
  };

  onReady = () => {    
    this.Pyramid.setProvider(this.web3.currentProvider);

    this.route.queryParams.subscribe(p => this.refereeAddress = p["r"]);
    
    if (this.refereeAddress) {
      this.changeRecipient(this.refereeAddress);
    }
    
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
      this.account = this.accounts[0];
      console.log(this.account);
      // This is run from window:load and ZoneJS is not aware of it we
      // need to use _ngZone.run() so that the UI updates on promise resolution
      this._ngZone.run(() => {
        this.getRefereeCount();
        this.getContributionStatus();
      });
    });
    
    const contribs = window.firebase.database().ref('contributions/');
    contribs.on('value', (snapshot) => {
      var items = snapshot.val();
      this.lastContributions = Object.keys(items || {})
        .filter(key => items[key] < 2)
        .map(key => {
          return { address: key, count: items[key] }
        });
    });    
  };

  changeRecipient(address) {
    this.recipientAddress = address;
  }

  getRefereeCount = () => {
    this.Pyramid
      .deployed()
      .then(instance => {
        return instance.getRefereeCount.call(this.account);
      })
      .then(value => {
        this.balance = value;
      })
      .catch(e => {
        console.log(e);
        this.setStatus('Error getting balance; see log.');
      });
  };

  getContributionStatus = () => {
    this.Pyramid
      .deployed()
      .then(instance => {
        return instance.hasContributed.call(this.account);
      })
      .then(hasContributed => {
        this.hasContributed = hasContributed;
      })
      .catch(e => {
        console.log(e);
        this.setStatus("Error checking contribution status");
      });
  }

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
          console.log("You've already been paid out");
        }
        return instance.hasContributed.call(this.account);
      })
      .then(hasContributed => {
        if (hasContributed) {
          console.log("You have already contributed");
        }
        console.log("Contributing");
        return instance.getRefereeCount.call(receiver);        
      })
      .then(refereeCount => {
        // Incrementing this here is dodgy because there's no guarantee
        // the tx will actually happen
        console.log(refereeCount);
        const count = refereeCount.add(1);

        if (count.lt(2)) {
          const database = window.firebase.database();
          window.firebase.database().ref('contributions/' + receiver).set(count.toString('10'));        
        }

        return instance.contribute(receiver, {
          from: this.account,
          value: this.web3.toWei(1, "ether")
        });
      })
      .then(txHash => {
        console.log(txHash);
        this.hasContributed = true;
        this.setStatus("Contribution received");
        
      })
      .catch(e => {
        console.log(e);
        this.setStatus("Error contributing");
      });
  }
}
