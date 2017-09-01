pragma solidity ^0.4.15;

contract Pyramid {
    
    struct Contribution {
        bool contributed;
        bool paidOut;
        address referrer;
        uint referreeCount;
    }
    
    address public owner;
    mapping(address => Contribution) public contributions;
    

    function Pyramid() {
        owner = msg.sender;
        
        // Owner gets the first contribution
        Contribution memory ownerContribution;
        ownerContribution.contributed = true;
        contributions[owner] = ownerContribution;    
    }
    
    function kill() {
        if(msg.sender != owner) revert();
        
        selfdestruct(owner);
    }

    function getReferreeCount(address addr) public constant returns(uint count) {
        return contributions[addr].referreeCount;
    }
    
    function hasContributed(address addr) public constant returns(bool yes) {
        return contributions[addr].contributed;
    }

    function isPaidOut(address addr) public constant returns(bool yes) {
        return contributions[addr].paidOut;
    }
    
    function contribute(address referrer) public payable returns (bool success) {
        
        require(msg.value == 1 ether);
        
        Contribution storage referrerContribution = contributions[referrer];
        
        // Don't continue if the referrer has not contributed
        if (!referrerContribution.contributed) revert();

        // Don't contribute if this has been paid out
        if(referrerContribution.paidOut) revert();
                        
        // Don't continue if the sender has already contributed
        if (contributions[msg.sender].contributed) revert(); 

        Contribution memory contribution;
        contribution.contributed = true;
        contribution.referrer = referrer;
        
        contributions[msg.sender] = contribution;
        
        referrerContribution.referreeCount++;
        
        if(referrerContribution.referreeCount == 2) {
            referrerContribution.paidOut = true;
            referrer.transfer(2 ether);
        }
        
        return true;
    }
}