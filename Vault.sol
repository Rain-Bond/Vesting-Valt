// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.5;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Vault {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    
    address public auth;
    address public owner;
    address public tknContract;

    uint public startTime;
    uint public unlockedBalance;
    uint public totalBalance;

    uint256 public curveA;
    uint256 public curveI;
    uint256 public curveT;
    uint256 public curveY0;
    uint256 public totalWithdraw;
    uint256 public initTotal;

    uint256 public UNLOCK_TERN = 1 days;

    constructor(uint256 _cT, uint256 _cI, uint256 _cY0) {
        auth = msg.sender;
        curveT = _cT;
        curveI = _cI;
        curveY0 = _cY0;
    }

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

    // -------------------------------------------------
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
    /**
        @notice get TotalBalance
    */
    function getTotalBalance() public view returns(uint) {
        return IERC20(tknContract).balanceOf(address(this));
    }
    
    /**
        @notice withdraw token to _address
    */
    function withdraw(address _address, uint _amount) public onlyOwner {
        if (initTotal == 0) initTotal = IERC20(tknContract).balanceOf(address(this));
        unlockedBalance = getunlockedBalance();
        totalBalance = getTotalBalance();
        require(unlockedBalance > 0 && _amount <= unlockedBalance, "unlocked balance is equal to 0 or unlockedBalance is too big");
        IERC20(tknContract).transfer(_address, _amount);
        totalBalance -= _amount;
        unlockedBalance -=_amount;
        totalWithdraw += _amount;
    }
}