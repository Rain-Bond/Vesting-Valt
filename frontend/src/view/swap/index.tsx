import React, { useEffect, useRef, useState } from 'react';
import { Form, InputNumber, Select, Button, Space, Radio, Layout } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { ethers } from 'ethers';
import { useWeb3React } from "@web3-react/core";
import {BigNumber} from 'bignumber.js';
import RouterABI from '../../config/routerABI';
import erc20ABI from '../../config/erc20ABI';
import { Pool } from '@uniswap/v3-sdk'
import { CurrencyAmount, Token, TradeType } from '@uniswap/sdk-core'
import IUniswapV3PoolABI from '../../config/IUniswapV3PoolABI';
import { Route } from '@uniswap/v3-sdk'
import { Trade } from '@uniswap/v3-sdk'
import QuoterABI from '../../config/QuoterABI'
const { Option } = Select;
type LayoutType = Parameters<typeof Form>[0]['layout'];

const provider = new ethers.providers.JsonRpcProvider('https://rinkeby.infura.io/v3/8572a0667cea49629888fea620830b5b');
const signer = provider.getSigner();
console.log('signers', signer);
// USDC-WETH pool address on mainnet for fee tier 0.05%

// const poolAddress = '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640'
const weth = new Token(4, '0xc778417E063141139Fce010982780140Aa0cD5Ab', 18, 'WETH', 'Wrapper eth');
const usdc = new Token(4, '0x19d31b7e068b5E1EC77fbc66116D686C82F169c2', 6, 'USDC', 'USDC Coin');

const poolAddress = Pool.getAddress(weth,usdc,5);
console.log('pooladdress', poolAddress);
const poolContract = new ethers.Contract(poolAddress, IUniswapV3PoolABI, provider)
const routerContract = new ethers.Contract('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', RouterABI, provider);
const quoterAddress = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'

const quoterContract = new ethers.Contract(quoterAddress, QuoterABI, provider);


interface Immutables {
  factory: string
  token0: string
  token1: string
  fee: number
  tickSpacing: number
  maxLiquidityPerTick: ethers.BigNumber
}

interface State {
  liquidity: ethers.BigNumber
  sqrtPriceX96: ethers.BigNumber
  tick: number
  observationIndex: number
  observationCardinality: number
  observationCardinalityNext: number
  feeProtocol: number
  unlocked: boolean
}


const Swap = () => {
    // const account = useWeb3React();
    const [account, setAccount] =useState('')
    const [loadingState, setloadingState] = useState(false);
    const [swapBtnState, setSwapBtnState] = useState(false);
    const [tokenAmountIn, setTokenAmountIn] = useState(0);
    const [tokenAmountOut, setTokenAmountOut] = useState(0);
    const AInputRef = useRef<any>();
    const BOutputRef = useRef<any>();
    const [tokenA, setTokenA] = useState('');
    const [tokenB, setTokenB] = useState('');
    let _signer: ethers.providers.JsonRpcSigner;    
    // const account = useWeb3React();
    useEffect(() => {        
        console.log('account', account);
    }, [account])

    const [form] = Form.useForm();
    const [formLayout, setFormLayout] = useState<LayoutType>('horizontal');

    const connectWallet = async() => {        
        setloadingState(true);
        try {
            await window.ethereum.request({method: 'wallet_switchEthereumChain',params: [{ chainId: '0x4' }]});   
            try {
                await window.ethereum.request({ method: 'eth_requestAccounts', params: [{ chainId: '0x4' }]});   
            } catch (error) {
                console.log('error', error);
            }
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            _signer = provider.getSigner();            
            const addr = await signer.getAddress();
            setAccount(addr)
            console.log('wallet account', account, addr);            
         } catch (error) {
            console.log('wallet connection error');
         }       
        //  const wallet = await signer.getAddress();
        //  console.log('wallet', wallet);
        //  setAccount(wallet);
         setloadingState(false);
         setSwapBtnState(true);
    }

    
async function getPoolImmutables() {
    const [factory, token0, token1, fee, tickSpacing, maxLiquidityPerTick] = await Promise.all([
      poolContract.factory(),
      poolContract.token0(),
      poolContract.token1(),
      poolContract.fee(),
      poolContract.tickSpacing(),
      poolContract.maxLiquidityPerTick(),
    ])
  
    const immutables: Immutables = {
      factory,
      token0,
      token1,
      fee,
      tickSpacing,
      maxLiquidityPerTick,
    }
    return immutables
  }
  
  async function getPoolState() {
    // note that data here can be desynced if the call executes over the span of two or more blocks.
    const [liquidity, slot] = await Promise.all([poolContract.liquidity(), poolContract.slot0()])
  
    const PoolState: State = {
      liquidity,
      sqrtPriceX96: slot[0],
      tick: slot[1],
      observationIndex: slot[2],
      observationCardinality: slot[3],
      observationCardinalityNext: slot[4],
      feeProtocol: slot[5],
      unlocked: slot[6],
    }
  
    return PoolState
  }
  
  async function sdkSwap(amountIn:number, TokenAContract:string, TokenBContract:string) {
    // query the state and immutable variables of the pool
    const [immutables, state] = await Promise.all([getPoolImmutables(), getPoolState()])
  
    // create instances of the Token object to represent the two tokens in the given pool
    const TokenA = new Token(4, immutables.token0, 6, 'USDC', 'USD Coin')
  
    const TokenB = new Token(4, immutables.token1, 18, 'WETH', 'Wrapped Ether')
  
    // create an instance of the pool object for the given pool
    const poolExample = new Pool(
      TokenA,
      TokenB,
      immutables.fee,
      state.sqrtPriceX96.toString(), //note the description discrepancy - sqrtPriceX96 and sqrtRatioX96 are interchangable values
      state.liquidity.toString(),
      state.tick
    )
  
   
    // call the quoter contract to determine the amount out of a swap, given an amount in
    const quotedAmountOut = await quoterContract.callStatic.quoteExactInputSingle(
      immutables.token0,
      immutables.token1,
      immutables.fee,
      amountIn.toString(),
      0
    )
      
    // create an instance of the route object in order to construct a trade object
    const swapRoute = new Route([poolExample], TokenA, TokenB)
  
    // create an unchecked trade instance
    const uncheckedTradeExample = await Trade.createUncheckedTrade({
      route: swapRoute,
      inputAmount: CurrencyAmount.fromRawAmount(TokenA, amountIn.toString()),
      outputAmount: CurrencyAmount.fromRawAmount(TokenB, quotedAmountOut.toString()),
      tradeType: TradeType.EXACT_INPUT,
    })
  
    // print the quote and the unchecked trade instance in the console
    console.log('The quoted amount out is', quotedAmountOut.toString())
    console.log('The unchecked trade object is', uncheckedTradeExample)
  }
    
    const swapTokens = async() => {         
      const uniswapContract = new ethers.Contract('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', RouterABI, _signer);       
        const callPath = ['0xc778417E063141139Fce010982780140Aa0cD5Ab', '0x19d31b7e068b5E1EC77fbc66116D686C82F169c2'];
        const deadline = new Date().getTime();
        const amountIn = tokenAmountIn;
        const amountOutMin = tokenAmountOut;
        const sender = account;
        setloadingState(true);        
        // sdkSwap(tokenAmountIn,'','');
        try {
          await routerContract.swapExactTokensForTokens(amountIn, amountOutMin, callPath, sender, deadline);
        } catch (error) {
          console.log(error);
        }
        
        setloadingState(false);
    }

    const setInputAmount = async() => {
        // const routerContract = new ethers.Contract('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', RouterABI,   );
          setTokenAmountIn(AInputRef.current.valule);               
          const input = ethers.BigNumber.from((AInputRef.current.value)*10**12);        
          const callPath = ['0xc778417E063141139Fce010982780140Aa0cD5Ab', '0x19d31b7e068b5E1EC77fbc66116D686C82F169c2'];        
          const output = await routerContract.getAmountsOut(input, callPath);        
          console.log('output', output);
          setTokenAmountOut(output[0]);
          BOutputRef.current.value = output;               
        // const [immutables, state] = await Promise.all([getPoolImmutables(), getPoolState()]) 
        // const amountOut = await quoterContract.callStatic.quoteExactInputSingle(
        //     immutables.token0,
        //     immutables.token1,
        //     immutables.fee,
        //     tokenAmountIn.toString(),
        //     0
        //   )   
          
    }

    const tokenList = [
        {name:'WETH'},
        {name:'USDC'}
    ]
    const tokenASelectAfter = (
        <Select defaultValue={tokenList[0].name} style={{ width: 120 }}>
          {
            tokenList.map((token:any) => {
                return(
                    <Option key={token.name} value={token.name}>{token.name}</Option>
                )                        
            })          
          }
        </Select>
      );

      const tokenBSelectAfter = (
        <Select defaultValue={tokenList[1].name} style={{ width: 120 }}>
          {
            tokenList.map((token:any) => {
                return(
                    <Option key={token.name} value={token.name}>{token.name}</Option>
                )                        
            })          
          }
        </Select>
      );




    return (
        <>
            <Layout style={{marginTop:'80px', minWidth:'450px', minHeight:'450px', borderRadius:'18px', backgroundColor:'#faad1475', boxShadow: '0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)'}} >
                <Form style={{marginTop:'30px'}}>
                    <Form.Item style={{display:'flex', justifyContent:'center'}}>
                        <h1>Swap</h1>
                    </Form.Item>
                    <Form.Item style={{marginTop:'20px'}}>
                        <InputNumber ref={AInputRef} addonAfter={tokenASelectAfter} value={tokenAmountIn} defaultValue={0} onChange={ () => setInputAmount() } size='large' style={{width:'380px', color: '#004578', fontFamily:'fantasy'}}  />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" shape="circle" icon={<DownloadOutlined />}  />
                    </Form.Item>
                    <Form.Item style={{marginTop:'30px'}}>
                        <InputNumber ref={BOutputRef} addonAfter={tokenBSelectAfter} value={tokenAmountOut} defaultValue={100} size='large' style={{width:'380px', color: '#004578', fontFamily:'fantasy'}} readOnly />
                    </Form.Item>
                    <Radio.Group value={formLayout}>
                        <Radio.Button value="1">1%</Radio.Button>
                        <Radio.Button value="5">5%</Radio.Button>
                        <Radio.Button value="10">10%</Radio.Button>
                    </Radio.Group>
                    <Form.Item style={{marginTop:'30px', textAlign:'center'}}>
                        <Button type='primary' loading={loadingState} onClick={ () => connectWallet() } style={{display:`${swapBtnState==false?'block':'none'}`}} >Connect Wallet</Button>
                        <Button type='primary' loading={loadingState} onClick={ () => swapTokens() } style={{display:`${swapBtnState==true?'block':'none'}`}}  > Swap </Button>
                    </Form.Item>
                </Form>
            </Layout>
        </>      
    );
  };
  

export default Swap;