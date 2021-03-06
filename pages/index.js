import { BigNumber, Contract, providers, utils } from "ethers";
import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import {
  NFT_CONTRACT_ABI,
  NFT_CONTRACT_ADDRESS,
  TOKEN_CONTRACT_ABI,
  TOKEN_CONTRACT_ADDRESS,
} from "../constants";
import styles from "../styles/Home.module.css";

export default function Home() {
  //create BigNumber `0`
  const zero = BigNumber.from(0);
  //walletConnected keeps track of whether the user's wallet is connected or not
  const [walletConnected, setWalletConnected] = useState(false);
  //loading is set to true when we are waiting for a transaction to be mined
  const [loading, setLoading] = useState(false);
  //tokensToBeClaimed keeps track of the number of tokens that can be claimed
  //based on the Crypto Dev NFT's held by the user which haven't claimed the tokens
  const [tokensToBeClaimed, setTokensToBeClaimed] = useState(zero);
  //balanceOfCryptoDevTokens keeps track of the number of Crypto Dev tokens owned by an address
  const [balanceOfCryptoDevTokens, setBalanceOfCryptoDevTokens] = useState(zero);
  //amount of the tokens that the user wants to mint
  const [tokenAmount, setTokenAmount] = useState(zero);
  //tokensMinted is the total number of tokens that have been minted till now out of max total supply (20000)
  const[tokensMinted, setTokensMinted] = useState(zero);
  //create a reference to the Web3Modal (used for connecting to Metamask) which persists as long as the page remains open
  const web3ModalRef = useRef();
  
  //getTokensToBeClaimed checks the balance of the tokens that can be claimed by the user
  const getTokensToBeClaimed = async () => {
    try {
      //get the provider from web3Modal, which in our case is Metamask
      //no need for the Signer here, as we are only reading state from the blockchain 
      const provider = await getProviderOrSigner();
      //create an instance of NFT Contract
      const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        NFT_CONTRACT_ABI,
        provider
      );
      //create an instance of tokenContract
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
      //we will get the signer now to extract the address of the currently connected Metamask account
      const signer = await getProviderOrSigner(true);
      //get the address associated to the signer which is connected to Metamask
      const address = await signer.getAddress();
      //call the balanceOf from the NFT contract to get the number of NFT's held by the user
      const balance = await nftContract.balanceOf(address);
      //balance is a Big number and thus we would compare it with Big number `zero`
      if (balance === zero) {
        setTokensToBeClaimed(zero);
      } else {
        //amount keeps track if the number of unclaimed tokens
        var amount = 0;
        /*
        For all the NFT's, check if the tokens have already been claimed, only increase the amount if the tokens 
        have not been claimed for an NFT  (for a given tokenId)
        */
        for (var i = 0; i < balance; i++) {
          const tokenId = await nftContract.tokenOfOwnerByIndex(address, i);
          const claimed = await tokenContract.tokenIdsClaimed(tokenId);
          if (!claimed) {
            amount ++;
          }
        }
        //tokensToBeClaimed has been initialized to a Big Number, thus we would convert amount to a big number and then 
        //set its value
        setTokensToBeClaimed(BigNumber.from(amount));
      }
    } catch (err) {
      console.error(err);
      setTokensToBeClaimed(zero);
    }
  };
  
  //getBalanceOfCryptoDevTokens checks the balance of Crypto Dev Tokens's held by an address
  const getBalanceOfCryptoDevTokens = async () => {
    try {
      //get the provider from web3Modal, which in our case is Metamask
      //no need for the Signer here, as we are only reading state from the blockchain
      const provider = await getProviderOrSigner();
      //create an instance of token contract
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
      //we will get the signer now to extract to get the number of tokens held by the user
      const signer = await getProviderOrSigner(true);
      //get the address associated to the signer which is connected to Metamask
      const address = await signer.getAddress();
      //call the balanceOf from the token contract to get the number of tokens held by the user
      const balance = await tokenContract.balanceOf(address);
      //balance is already a Big number, so we don't  need to convert it before setting it
      setBalanceOfCryptoDevTokens(balance);
    } catch (err) {
      console.error(err);
      setBalanceOfCryptoDevTokens(zero);
    }
  };

  //mintCryptoDevToken mints `amount` number of tokens to a given address
  const mintCryptoDevToken = async (amount) => {
    try {
      //we need a Signer here since this is a write transaction
      const signer = await getProviderOrSigner(true);
      //create an instance of tokenContract
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        signer
      );
      //each token is of `0.001 ether`. The value we need to send is `0.001 * amount`
      const value = 0.001 * amount;
      const tx = await tokenContract.mint(amount, {
        //value signifies the cost of one Crypto Dev token which is `0.001` eth.
        //we are parsing `0.001` string to ether using the utils from ethers.js
        value: utils.parseEther(value.toString())
      });
      setLoading(true);
      //wait for the transaction to get mined
      await tx.wait();
      setLoading(false);
      window.alert("Tokens Crypto Dev minteados con ??xito");
      await getBalanceOfCryptoDevTokens();
      await getTotalTokensMinted();
      await getTokensToBeClaimed();
    } catch (err) {
      console.error(err);
    }
  };
  //claimCryptoDevTokens helps the user claim Crypto Dev Tokens
  const claimCryptoDevTokens = async () => {
    try {
      //we need a Signer here since this is a `write` transaction
      const signer = await getProviderOrSigner(true);
      //create an instance of tokenContract
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        signer 
      );
      const tx = await tokenContract.claim();
      setLoading(true);
      //wait for the transaction to get mined
      await tx.wait();
      setLoading(false);
      window.alert("Tokens Crypto Dev reclamados con ??xito");
      await getBalanceOfCryptoDevTokens();
      await getTotalTokensMinted();
      await getTokensToBeClaimed();
    } catch (err) {
      console.error(err);
    }
  };
  //getTotalTokensMinted retrieves how many tokens have been minted till now out of the total supply
  const getTotalTokensMinted = async () => {
    try {
      //get the provider from web3Modal, which in our case is Metamask
      //no need for the signer here, as we are only reading state from the blockchain
      const provider = await getProviderOrSigner();
      //create an instance of token contract
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
      //get all the tokens that have been minted
      const _tokensMinted = await tokenContract.totalSupply();
      setTokensMinted(_tokensMinted);
    } catch (err) {
      console.error(err);
    }
  };
  /*
  Returns a Provider or Signer object representing the Ethereum RPC with or without the
  signing capabilities of metamask attached.
  A `Provider` is needed to interact with the blockchain reading transactions, reading balances, reading state, etc.
  A `Signer` is a special type of Provider used in case a `write` transaction needs to be made to the blockchain, which involves the connected account
  needing to make a digital signature to authorize the transaction being sent. Metamask exposes a Signer API to allow your website to
  request signatures from the user using Signer functions.
  @param {*} needSigner - True if you need the signer, default false otherwise.
  */
  const getProviderOrSigner = async (needSigner = false) => {
    //connect to Metamask
    //since we store `web3Modal` as a reference, we need to access the `current` value to get access to the underlying object
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);
    //if user is not connected to the Rinkeby network let them know and throw an error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 4) {
      window.alert("Cambia tu billetera a la red Rinkeby");
      throw new Error("Change the network to Rinkeby");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  //connectWallet connects the Metamask wallet
  const connectWallet = async () => {
    try {
      //get the provider from web3Modal, which in our case is Metamask
      //when used for the first time, it prompts the user to connect their wallet
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  /*
  useEffects are used to react to changes in the state of the website
  The array at the end of function call represents what state changes will trigger this effect
  In this case, whenever the value of `walletConnected` changes - this effect will be called
  */
  useEffect(() => {
    //if wallet is not connected, create a new instance of Web3modal and connect the Metamask wallet
    if (!walletConnected) {
      //assign the web3Modal class to the reference object by setting its `current` value
      //the `current` value is persisted throughout as long as this page is open
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
      getTotalTokensMinted();
      getBalanceOfCryptoDevTokens();
      getTokensToBeClaimed();
    }
  }, [walletConnected]);

  //renderButton returns a button based on the state of the dApp
  const renderButton = () => {
    //if we are currently waiting for something, return a loading button
    if (loading) {
      return (
        <div>
          <button className={styles.button}>Cargando...</button>
        </div>
      );
    }
    // If tokens to be claimed are greater than 0, Return a claim button
    if (tokensToBeClaimed > 0) {
      return (
      <div>
      <div className={styles.description}>
      {tokensToBeClaimed * 10} Tokens can be claimed!
      </div>
      <button className={styles.button} onClick={claimCryptoDevTokens}>
      Claim Tokens
      </button>
      </div>
      );
    }
    //if user doesn't have any tokens to claim, show the mint button
    return  (
      <div style={{ display: "flex-col" }}>
        <div>
          <input
          type="number"
          placeholder="Cantidad de Tokens"
          //BigNumber.from converts the `e.target.value` to a BigNumber
          onChange={(e) => setTokenAmount(BigNumber.from(e.target.value))}
          className={styles.input}
          />
        </div>
        <button 
          className={styles.button}
          disabled={!(tokenAmount > 0)}
          onClick={() => mintCryptoDevToken(tokenAmount)}>
            Mintear Tokens
          </button>
      </div>
    );
  };
  return (
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name="description" content="ICO-dApp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Bienvenide a Crypto Devs ICO!</h1>
          <div className={styles.description}>
            Puedes reclamar o mintear Crypto Dev tokens aqu??
          </div>
          { walletConnected ? (
            <div>
              <div className={styles.description}>
                {/*Format Ether helps us in converting a BigNumber to string*/}
                Has minteado {utils.formatEther(balanceOfCryptoDevTokens)} Crypto Dev Tokens
              </div>
              <div className={styles.description}>
                {/* Format Ether helps us in converting a BigNumber to string */}
                Un total de {utils.formatEther(tokensMinted)}/10000 ya fueron minteados!!!
              </div>
              {renderButton()}
            </div>
          ) : (
            <button onClick={connectWallet} className={styles.button}>
              Conecta tu billetera
            </button>
          )}
        </div>
        <div>
          <img className={styles.image} src="./0.svg" />
        </div>
      </div>
      <footer className={styles.footer}>
      Made with &#10084; by Martin Iglesias
      </footer>
    </div>
  );
}