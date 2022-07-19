
# Vault for Timelock Curve - Rain




## Summary

This project is a implementation of token vesting process.
The token vesting process is follow.
1. Lock some tokens especially "SDEX".
2. Set lock duration and during that certain time whole locked tokens will unlock.
3. Unlock rate of tokens will increase depend on certain curve until time is up.

#### The project is related in step2 and step3, 
##### I implemented two functionalities.
- First, permission management.
- Second, process of unlock controlled by permission.





## Project description

1. There are two permissions, Auth and Owner in this projcet.
 - Auth can set owner address and token address.
 - Owner can withdraw.
--------------------------------------------
 To totally manage permission, define two modifiers.
``` solidity
/**
* @dev Throws if called by any account other than the owner.
*/
modifier onlyOwner() {
    require(msg.sender == owner);
    _;
}
/**
* @dev Throws if called by any account other than the auther.
*/
modifier onlyAuther() {
    require(msg.sender == auth);
    _;
}
```

2. The project consist of three logic controlled by permission.
 - setting owner address
 - setting token address 
 - withdrawing.

----------------------------------------------

By using "onlyAuth" modifier, only auth can set owner address.


``` solidity
/**
    @notice set owner address to _address
*/
function setOwner(address _address) public onlyAuther {
    require(owner == address(0), "Owner address is already set.");
    owner = _address;
}
```
By using "onlyAuth" modifier, only auth can set token address.
``` solidity
/**
    @notice tknContract address to _address
*/
function setTkn(address _address) public onlyAuther {
    require(tknContract == address(0), "Token contract address is existed");
    tknContract = _address;
    startTime = block.timestamp;
}
```

In the same way by using "onlyOwner" modifier, only owner can withdraw unlocked balance.

``` solidity
/**
    @notice withdraw token to _address
*/
function withdraw(address _address, uint _amount) public onlyOwner {
    if (initTotal == 0) initTotal = IERC20(tknContract).balanceOf(address(this));
    // get unlocked balance from getunlockedBalance function.
    unlockedBalance = getunlockedBalance();
    // get total balance from getTotalBalance function.
    totalBalance = getTotalBalance();

    require(unlockedBalance > 0 && _amount <= unlockedBalance, "unlocked balance is equal to 0 or unlockedBalance is too big");
    IERC20(tknContract).transfer(_address, _amount);
    totalBalance -= _amount;
    totalWithdraw += _amount;
    unlockedBalance -=_amount;
}

```
Inside "withdraw" function you can see getunlockedBalance() function and this function is an implementation of increasing curve.
The unlocked balance will update every 24 hr.
``` solidity
/**
    @notice get unlockedBalance
*/
function getunlockedBalance() public view returns(uint)  {
    uint duration = (block.timestamp - startTime) / UNLOCK_TERN;
    if (duration > curveT) duration = curveT;
    
    uint unlockedBalance_ = getTotalBalance();
    if (initTotal != 0) unlockedBalance_ = initTotal;
    
    uint state_part1 = (100 - curveY0);
    uint state_part2 = 10000 * (10 ** duration - curveI ** duration) / (curveI ** duration);
    uint state_part3 = 10000 * (curveI ** curveT) / (10 ** curveT - curveI ** curveT);
    
    unlockedBalance_ = unlockedBalance_ * (state_part1 * state_part2 * state_part3 + curveY0 * 10000 * 10000) / 100 / 10000 / 10000;

    return unlockedBalance_ - totalWithdraw;
}
```

## Feedback

If you have any feedback, please reach out to us at purplestrawberrymilk@gmail.com

