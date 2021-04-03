// Uses the async-await "serial" fashion to fetch the chain data.
//
// This can be slow, but simplifies the logic.
// (Anyway, Ethereum is slower!!)
//
async function fetchAndShowContractData(contract, yourAddress) {
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
                    } else if (highBidder != null && secondBid != null) {
                        personalInfo += `Congratulations! Your NFT was sold at the price of ${asWeiAndEther(secondBid)}!\n`;
                        personalInfo += `You can call withdraw() to get your money.\n`;
                    }
                }

                if (yourAddress != null && !isEqual(yourAddress, seller)) {
                    if (isEqual(highBidder, yourAddress) && secondBid != null) {
                        personalInfo += `Congratulations! You won the auction. You paid the seller ${asWeiAndEther(secondBid)}.\n`;
                        personalInfo += `You can call claim() to claim your NFT, if you haven't done so.\n`;
                        personalInfo += `And you can call withdraw() to get back your overpaid part of the deposit.\n`;
                    }

                    if (!isEqual(highBidder, yourAddress)) {
                        await query("revealed(address)", async () => {
                            let yourHashedBid = await contract.hashedBidOf(yourAddress);
                            if (!isZeroHex(yourHashedBid)) {
                                personalInfo += `You did not win the auction. Better luck next time!\n`;
                                youHaveRevealed = await contract.revealed(yourAddress);
                                if (youHaveRevealed == true) {
                                    personalInfo += `You can call withdraw() to get back your deposit.\n`;
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
    setTimeout(fetchAndShowContractData, 10000, contract, yourAddress);
}


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
    if (!info.whoami || !isLegalAddress(info.whoami)) {
        info.whoami = null;
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
    fetchAndShowContractData(auctionContract, info.whoami);
    
    // Show some static info:
    let prefix = "https://ropsten.etherscan.io/address/"
    document.getElementById("contract-address").innerHTML =
        `Auction contract address: ${info.addr} [${makeHref("View on Etherscan", prefix + info.addr)}]`;
    document.getElementById("your-address").innerHTML = `Your address: ${info.whoami}`;
}

