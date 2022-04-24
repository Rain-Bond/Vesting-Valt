import React, { useEffect } from 'react';
import logo from './logo.svg';
import './App.css';
import HeaderComponent from './components/header';
import FooterComponent from './components/footer';
import Swap from './view/swap';
import { Row, Col } from 'antd'
import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum: any;
    web3: any;
  }
} 

function App() {
  useEffect(() => {

  }, [])
  return (
    <div className="App">
      {/* <HeaderComponent /> */}
        <Row justify='center'>
          <Col span={8}></Col>
          <Col span={8}>
            <Swap />
          </Col>
          <Col span={8}></Col>
        </Row>          
      {/* <FooterComponent /> */}
    </div>
  );
}

export default App;
