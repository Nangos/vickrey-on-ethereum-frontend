// Uses the async-await "serial" fashion to fetch the chain data.
//
// This can be slow, but simplifies the logic.
// (Anyway, Ethereum is slower!!)
//
async function fetchAndShowContractData(contract, signableContract) {
    let yourAddress = ethereum.selectedAddress;
    document.getElementById("your-address").innerHTML = `Your address: ${yourAddress}`;

    clearAllButtons();
    if (yourAddress == null) {
        addLogInButton();
    }

    let generalInfo = "\nGeneral Info:\n";
    let personalInfo = "\nPersonal Info:\n";
    let errorInfo = "\n";
    if (yourAddress == null) {
        personalInfo += "N/A\n";
    }
    let noError = errorInfo;

    let summary = "This auction has not started yet.";

    let query = async (queryName, queryFunction) => {
        try {
            return await queryFunction();
        } catch (err) {
            console.error(err);
            errorInfo += `Failed to query "${queryName}"; see console log for details.\n`;
            return null;
        }
    }

    // I still wanna know how fast/slow it is. Let me measure it.
    let startTime = new Date().getTime();

    let seller = await query("seller()", async () => {
        let seller = await contract.seller();
        generalInfo += `Auction seller: ${seller}\n`;
        return seller;
    })

    let tokenAddress = await query("tokenAddress()", async () => {
        let tokenAddress = await contract.tokenAddress();
        generalInfo += `Address of the NFT: ${tokenAddress}\n`;
        return tokenAddress;
    })

    let tokenID = await query("tokenID()", async () => {
        let tokenID = await contract.tokenID();
        generalInfo += `ID of the NFT: ${tokenID}\n`;
        return tokenID;
    })

    let reservePrice = await query("reservePrice()", async () => {
        let priceInWei = await contract.reservePrice();
        generalInfo += `The lowest possible price to bid: ${asWeiAndEther(priceInWei)}\n`;
        return priceInWei;
    })

    let started = await query("started()", async () => {
        let started = await contract.started();
        if (!started) {
            generalInfo += "Auction has not started yet!\n";
            if (isEqual(seller, yourAddress)) {
                personalInfo += "You are the seller! Are you ready to start the auction?\n";
            } else if (yourAddress != null) {
                personalInfo += "Please wait patiently until the auction starts. Wanna learn how to play?\n";
            }
        }
        return started;
    })

    if (started) {
        let endOfBidding = await query("endofBidding()", async () => {
            let timestamp = await contract.endOfBidding();
            timestamp = timestamp.toNumber();
            readableTime = new Date(timestamp * 1000).toLocaleString();
            generalInfo += `Bidding deadline: ${readableTime} (Timestamp is ${timestamp})\n`;
            return timestamp;
        })

        let endOfRevealing = await query("endOfRevealing()", async () => {
            let timestamp = await contract.endOfRevealing();
            timestamp = timestamp.toNumber();
            readableTime = new Date(timestamp * 1000).toLocaleString();
            generalInfo += `Revealing deadline: ${readableTime} (Timestamp is ${timestamp})\n`;
            return timestamp;
        })

        let now = Math.floor(new Date().getTime() / 1000);

        if (endOfBidding != null && now > endOfBidding) {
            summary = "This auction is at the REVEALING stage.";
        } else {
            summary = "This auction is at the BIDDING stage.";
        }

        if (endOfBidding != null && endOfRevealing != null) {
            if ((yourAddress != null && !isEqual(yourAddress, seller)) && now < endOfBidding) {
                await query("hashedBidOf(address)", async () => {
                    let yourHashedBid = await contract.hashedBidOf(yourAddress);
                    if (isZeroHex(yourHashedBid)) {
                        personalInfo += `Seems like you have not bidded yet. Wanna join?\n`;
                        if (reservePrice != null) {
                            addDepositButton(signableContract, reservePrice);
                        }
                    } else {
                        personalInfo += `Your secret bid is ${yourHashedBid}.\nDon't forget to reveal it when it's time!\n`;
                    }
                })
            }

            if ((yourAddress != null && !isEqual(yourAddress, seller)) && (now >= endOfBidding && now < endOfRevealing)) {
                await query("revealed(address)", async () => {
                    let yourHashedBid = await contract.hashedBidOf(yourAddress);
                    if (isZeroHex(yourHashedBid)) {
                        personalInfo += `You cannot join at this time.\n`;
                    } else {
                        let youHaveRevealed = await contract.revealed(yourAddress);
                        if (youHaveRevealed) {
                            personalInfo += `You have successfully revealed! Let's wait for the final result. Good luck!\n`;
                        } else {
                            personalInfo += `Seems like you have not revealed yet. Don't miss the deadline!\n`;
                            addRevealButton(signableContract);
                        }
                    }
                })
            }

            if (isEqual(yourAddress, seller) && now < endOfRevealing) {
                personalInfo += `Welcome back, seller! Let's grab some tea and wait for a good price!\n`;
            }

            let gracePeriod = 30; // wait for another 30 seconds just to be sure (avg. block time on Ethereum is ~15s)
            if (now >= endOfRevealing && now < endOfRevealing + gracePeriod) {
                summary = "This auction will end soon!";

                if (yourAddress != null) {
                    personalInfo += `Do you believe in last-minute miracles???\n`;
                }
            }
            
            if (now >= endOfRevealing + gracePeriod) {
                summary = "This auction has ended.";

                let highBidder = await query("highBidder()", async () => {
                    let highBidder = await contract.highBidder();
                    if (isEqual(highBidder, seller)) {
                        generalInfo += `There was no winner! Oops...\n`;
                    } else {
                        generalInfo += `Auction ended, the winner was ${highBidder}\n`;
                    }
                    return highBidder;
                })

                let highBid = await query("highBid()", async () => {
                    let highBidInWei = await contract.highBid();
                    if (highBidder != null && !isEqual(highBidder, seller)) {
                        generalInfo += `The highest bid was ${asWeiAndEther(highBidInWei)}\n`;
                    }
                    return highBidInWei;
                })

                let secondBid = await query("secondBid()", async () => {
                    let secondBidInWei = await contract.secondBid();
                    if (highBidder != null && !isEqual(highBidder, seller)) {
                        generalInfo += `The second highest bid (the deal) was ${asWeiAndEther(secondBidInWei)}\n`;
                    }
                    return secondBidInWei;
                })

                if (isEqual(seller, yourAddress)) {
                    if (isEqual(highBidder, seller)) {
                        personalInfo += `Unfortunately, your NFT was not sold out!\n`;
                        personalInfo += `You can call claim() to get your NFT back, if you haven't done so.\n`;
                        addClaimButton(signableContract);
                    } else if (highBidder != null && secondBid != null) {
                        personalInfo += `Congratulations! Your NFT was sold at the price of ${asWeiAndEther(secondBid)}!\n`;
                        personalInfo += `You can call withdraw() to get your money.\n`;
                        addWithdrawButton(signableContract);
                    }
                }

                if (yourAddress != null && !isEqual(yourAddress, seller)) {
                    if (isEqual(highBidder, yourAddress) && secondBid != null) {
                        personalInfo += `Congratulations! You won the auction. You paid the seller ${asWeiAndEther(secondBid)}.\n`;
                        personalInfo += `You can call claim() to claim your NFT, if you haven't done so.\n`;
                        personalInfo += `And you can call withdraw() to get back your overpaid part of the deposit.\n`;
                        addClaimButton(signableContract);
                        addWithdrawButton(signableContract);
                    }

                    if (!isEqual(highBidder, yourAddress)) {
                        await query("revealed(address)", async () => {
                            let yourHashedBid = await contract.hashedBidOf(yourAddress);
                            if (!isZeroHex(yourHashedBid)) {
                                personalInfo += `You did not win the auction. Better luck next time!\n`;
                                youHaveRevealed = await contract.revealed(yourAddress);
                                if (youHaveRevealed == true) {
                                    personalInfo += `You can call withdraw() to get back your deposit.\n`;
                                    addWithdrawButton(signableContract);
                                }
                                if (youHaveRevealed == false) {
                                    personalInfo += `Unfortunately you cannot withdraw your deposit, because you did not reveal your bid in time.\n`;
                                }
                            } else {
                                personalInfo += `You did not participate in this auction.\n`;
                            }
                        })
                    }
                }
            }
        }
    }

    // finalize:
    let endTime = new Date().getTime();
    console.log(`Query time elapsed: ${endTime - startTime} ms.`)

    document.getElementById("general-info").innerText = generalInfo;
    document.getElementById("personal-info").innerText = personalInfo;
    document.getElementById("error-info").innerText = errorInfo;

    if (errorInfo != noError) {
        summary = ""; // does not show summary upon error
    }
    document.getElementById("summary").innerText = summary;

    // set timeout for the next run:
    setTimeout(fetchAndShowContractData, 10000, contract, signableContract);
}

// functions to add buttons:

function addRecommendButton(text, customAsyncFunction) {
    let button = document.createElement("button");
    button.innerText = text;
    button.onclick = async () => {
        try {
            result = await customAsyncFunction();
            txURL = "https://ropsten.etherscan.io/tx/" + result.hash;
            document.getElementById("success-info").innerHTML = 
                "Your transaction has been successfully submitted to the blockchain " +
                "and should take effect shortly.<br>" +
                "Track the progress " + makeHref("here", txURL) + "!";
            document.getElementById("errors").innerText = "";
        } catch (err) {
            console.log(err);
            document.getElementById("errors").innerText = "Operation failed!\n" 
                + "Error Message: " + err.message + "\n"
                + "See console logs for more information.";
            document.getElementById("success-info").innerText = "";
        }
    }
    document.getElementById("buttons").appendChild(button);
}

function addDepositButton(signableContract, minimum) {
    addRecommendButton("Secretly Bid", async () => {
        // query the user:
        let bidInWei = null;
        while (!bidInWei || bidInWei.lt(minimum)) {
            response = window.prompt(
                "How much (in wei) would you bid for the NFT?\n\n" +
                "NOTE: your bid must be NO SMALLER THAN the minimal price (" + minimum.toString() + " wei)",
                ""
            );
            bidInWei = parseBigNumber(response);
        }
        
        let deposit = null;
        while (!deposit || deposit.lt(bidInWei)) {
            response = window.prompt(
                "How much (in wei) would you deposit into the auction contract?\n\n" +
                "NOTE1: your deposit must be NO SMALLER THAN your bid (" + bidInWei.toString() + " wei).\n\n" +
                "NOTE2: your bid is a secret, but YOUR DEPOSIT IS PUBLIC. I recommend you use a different value from your bid.",
                ""
            );
            deposit = parseBigNumber(response);
        }

        let nonce = generateRandomNonce(); // directly make one for you!
        let encoder = ethers.utils.defaultAbiCoder;
        let hash = ethers.utils.keccak256(encoder.encode(["uint", "bytes32"], [bidInWei, nonce]));

        // Download the info and alert the user:
        let obj = {
            "contract": signableContract.address,
            "bid": bidInWei.toString(),
            "nonce": nonce,
            "hash": hash,
            "deposit": deposit.toString(),
        };
        fileName = "IMPORTANT-SECRET.json";
        downloadJSONFile(fileName, obj);
        window.alert(`Be sure to keep the downloaded file (${fileName}) in a secure place! You need it at the revealing stage.`);

        // process the transaction:
        let result = await signableContract.deposit(hash, {value: deposit});
        return result;
    });
}

function addRevealButton(signableContract) {
    addRecommendButton("Reveal Secret", async () => {
        window.alert("Please choose your secret file you downloaded MOST RECENTLY, probably with a name similar to 'IMPORTANT-SECRET.json'.")

        // fetch the secret file:
        let obj = await uploadFileAsJSON();
        if (!obj.contract || !obj.bid || !obj.nonce || !obj.hash || !obj.deposit) {
            throw Error("Wrong File: Missing JSON fields");
        }
        if (obj.contract != signableContract.address) {
            throw Error("Wrong File: Contract address mismatch");
        }

        // process the transaction:
        let result = await signableContract.reveal(obj.bid, obj.nonce);
        return result;
    });
}

function addClaimButton(signableContract) {
    addRecommendButton("Claim", async () => {
        let result = await signableContract.claim();
        return result;
    });
}

function addWithdrawButton(signableContract) {
    addRecommendButton("Withdraw", async () => {
        let result = await signableContract.withdraw();
        return result;
    });
}

function addLogInButton() {
    let button = document.createElement("button");
    button.innerText = "Log in via Metamask";
    button.onclick = async () => {
        try {
            await ethereum.request({ method: 'eth_requestAccounts' }); // connect to MetaMask
            location.reload(); // reload page
        } catch (err) {
            console.log(err);
            document.getElementById("errors").innerText = "Cannot log in. See console logs for more information.";
        }
    }
    document.getElementById("buttons").appendChild(button);
}

function clearAllButtons() {
    let buttons = document.getElementById("buttons");
    while (buttons.firstChild) {
        buttons.removeChild(buttons.firstChild);
    }
}


// MAIN:
async function onLoad() {
    // Query string checks:
    let info = getJsonFromUrl();
    if (!info.addr) {
        location.href = "navigator.html";
        return;
    }
    if (!isLegalAddress(info.addr)) {
        window.alert("Invalid address of auction contract.");
        location.href = "navigator.html";
        return;
    }

    // Environment sanity checks:
    if (typeof window.ethereum === 'undefined') {
        msg = "Cannot access Ethereum. Please make sure MetaMask is running.\n"
            + "When done, refresh the page.";
        window.alert(msg);
        document.getElementById("errors").innerText = msg;
        return;
    }

    let web3Provider = new ethers.providers.Web3Provider(window.ethereum);
    let network = await web3Provider.detectNetwork();
    if (network.name != "ropsten") {
        msg = "Please switch to Ropsten network via MetaMask.\n"
            + "When done, refresh the page.";
        window.alert(msg);
        document.getElementById("errors").innerText = msg;
        return;
    }

    // Show current time (updated every 500 ms):
    showTime();

    // Fetch & refresh the constract data every 10 seconds:
    let abi = await (await fetch("nft-vickrey.abi.json")).json();
    let auctionContract = new ethers.Contract(info.addr, abi, web3Provider);

    let web3Signer = web3Provider.getSigner();
    let signableContract = new ethers.Contract(info.addr, abi, web3Signer);

    fetchAndShowContractData(auctionContract, signableContract);
    
    // Show some static info:
    let prefix = "https://ropsten.etherscan.io/address/"
    document.getElementById("contract-address").innerHTML =
        `Auction contract address: ${info.addr} [${makeHref("View on Etherscan", prefix + info.addr)}]`;
}

