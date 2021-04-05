async function onLoad() {
    // Environment sanity checks:
    let web3Provider = await checkWeb3();
    if (web3Provider == null) {
        return;
    }
    if (ethereum.selectedAddress == null) { // require log-in
        document.getElementById("errors").innerText = "You need to log in.";
        document.getElementById("login-button").disabled = false;
        return;
    }
    // init as the ToyNFT address:
    target = document.getElementById("token-address");
    target.value = "0x8f7ae9a76d3cf821415b6c01e0171c61b36e3ed7";
    await onTokenAddressUpdated({target: target}); // The line above does not trigger the update, so I manually trigger it (sort of hacky??)
}

async function onLoginButtonClicked() {
    try {
        await ethereum.request({ method: 'eth_requestAccounts' }); // connect to MetaMask
        location.reload(); // reload page
    } catch (err) {
        console.log(err);
        document.getElementById("errors").innerText = "Cannot log in. See console logs for more information.";
    }
}

async function onMintButtonClicked() {
    let tokenAddress = document.getElementById("token-address").value;
    try {
        let uri = window.prompt("What's the URI of your NFT?", "changeMe!");
        let nftContract = await getContractAPI(tokenAddress, "toy-nft.abi.json", false);

        let tx = await nftContract.mintToyNFT(uri);
        let txURL = "https://ropsten.etherscan.io/tx/" + tx.hash;
        document.getElementById("status").innerHTML = 
            "Your transaction has been successfully submitted to the blockchain.<br>" +
            "Please wait shortly and keep this page open; you'll be noticed when done.<br>" +
            "Or, you can track the progress " + makeHref("here", txURL) + ".\n\n";

        addDinoGame("game"); // to make users pleased to wait

        let receipt = await tx.wait();
        let tokenID = receipt.events[0].topics[3]; // This hardcoding is bad, but we are just making a demo?
        tokenID = ethers.BigNumber.from(tokenID).toString(); // Convert to decimal to make it more readable.

        msg = "Your mint transaction has been confirmed! Its NFT Token ID is " + tokenID + ".";
        window.alert(msg);
        document.getElementById("status").innerText = msg;
        document.getElementById("errors").innerText = "";

        removeDinoGames("game");
    } catch (err) {
        console.log(err);
        document.getElementById("status").innerText = "";
        document.getElementById("errors").innerText = err.message;
    }
}

function updateItemChecker(inputElement, isValid) {
    let checker = inputElement.parentElement.getElementsByClassName("checker")[0];
    checker.innerText = isValid ? "\u2713" : ""; // A check mark
}

function updateItemInfo(inputElement, text) {
    let info = inputElement.parentElement.getElementsByClassName("info")[0];
    info.innerText = text;
}

function validateForm() {
    if (ethereum.selectedAddress == null) {
        document.getElementById("errors").innerText = "You need to log in.";
        document.getElementById("login-button").disabled = false;
        document.getElementById("create-button").disabled = true;
    } else {
        document.getElementById("create-button").disabled =
            !Array.from(document.getElementsByClassName("checker")).every(v => v.innerText == "\u2713");
    }
}

function update(event, isValid, text) {
    let inputElement = event.target;
    updateItemChecker(inputElement, isValid);
    updateItemInfo(inputElement, text);
    validateForm();
}

async function onTokenAddressUpdated(event) {
    let tokenAddress = event.target.value;
    document.getElementById("mint-button").disabled = (tokenAddress != "0x8f7ae9a76d3cf821415b6c01e0171c61b36e3ed7");
    if (!isLegalAddress(tokenAddress)) {
        update(event, false, "");
        return;
    }
    try {
        let nftContract = await getContractAPI(tokenAddress, "toy-nft.abi.json", true);
        let name;
        try {
            name = await nftContract.name();
        } catch {
            name = "(Unknown)";
        }
        let symbolName;
        try {
            symbolName = await nftContract.symbol();
        } catch {
            symbolName = "(Unknown)";
        }
        update(event, true, `Name: ${name}, Symbol: ${symbolName}`);
        document.getElementById("errors").innerText = "";
    } catch (err) {
        console.log(err);
        document.getElementById("status").innerText = "";
        document.getElementById("errors").innerText = err.message;
        update(event, false, "");
    }
}

async function onTokenIDUpdated(event) {
    let tokenID = event.target.value;
    let tokenAddress = document.getElementById("token-address").value;
    try {
        let nftContract = await getContractAPI(tokenAddress, "toy-nft.abi.json", true);
        let owner;
        try {
            owner = await nftContract.ownerOf(tokenID);
        } catch {
            owner = null;
        }
        let uri;
        try {
            uri = await nftContract.tokenURI(tokenID);
        } catch {
            uri = null;
        }
        if (isEqual(ethereum.selectedAddress, owner)) {
            update(event, true, `You own it! (URI=${uri})`);
        } else {
            if (uri == null) {
                update(event, false, "");
            } else {
                update(event, false, `No! You don't own it. (URI=${uri})`);
            }
        }
        document.getElementById("errors").innerText = "";
    } catch (err) {
        console.log(err);
        document.getElementById("status").innerText = "";
        document.getElementById("errors").innerText = err.message;
        update(event, false, "");
    }
}

function onReservePriceUpdated(event) {
    let reservePrice = parseBigNumber(event.target.value);
    if (reservePrice == null) {
        update(event, false, "");
    } else if (reservePrice.eq(0)) {
        update(event, false, "cannot be zero");
    } else {
        update(event, true, asWeiAndEther(reservePrice));
    }
    document.getElementById("errors").innerText = "";
}

function onPeriodUpdated(event) {
    let period = parseBigNumber(event.target.value);
    if (period == null) {
        update(event, false, "");
    } else if (period.eq(0)) {
        update(event, false, "cannot be zero");
    } else {
        update(event, true, asTimeIntervalString(period));
    }
    document.getElementById("errors").innerText = "";
}

function onBiddingPeriodUpdated(event) {
    return onPeriodUpdated(event);
}

function onRevealingPeriodUpdated(event) {
    return onPeriodUpdated(event);
}

// deploy!!

function appendStatus(html) {
    document.getElementById("status").innerHTML += html + "<br>";
}

async function onCreateButtonClicked() {
    let args = {
        tokenAddress: document.getElementById("token-address").value,
        tokenID: document.getElementById("token-id").value,
        reservePrice: document.getElementById("reserve-price").value,
        biddingPeriod: document.getElementById("bidding-period").value,
        revealingPeriod: document.getElementById("revealing-period").value,
    }
    console.log(args);
    document.getElementById("status").innerHTML = "";
    document.getElementById("errors").innerText = "";

    window.alert("It can take a while to create the auction. Keep this page open.");
    
    let auctionContract;
    let deployed = false;
    try {
        appendStatus("STEP 1/2: Deploy the auction contract...");
        let factory = await getContractFactory("nft-vickrey.abi.json", "nft-vickrey.bytecode.txt");
        auctionContract = await factory.deploy(
            args.tokenAddress, args.tokenID, args.reservePrice, args.biddingPeriod, args.revealingPeriod
        );
        let tx = auctionContract.deployTransaction;
        let txURL = "https://ropsten.etherscan.io/tx/" + tx.hash;
        appendStatus("Submitting the contract to blockchain... You can track progress " + makeHref("here", txURL));

        addDinoGame("game");
        
        await tx.wait();
        appendStatus("Deployment succeed!");
        appendStatus("");
        deployed = true;
    } catch (err) {
        console.log(err);
        document.getElementById("errors").innerText = "Failed to deploy the contract! See console log for details.\n" + err.message
            + "\n\nMake sure that everything works, and try again.";
    }
    if (!deployed) {
        return;
    }

    try {
        appendStatus("STEP 2/2: Approve the auction contract to sell your NFT...");
        let nftContract = await getContractAPI(args.tokenAddress, "toy-nft.abi.json", false);
        let tx = await nftContract.approve(auctionContract.address, args.tokenID);
        let txURL = "https://ropsten.etherscan.io/tx/" + tx.hash;
        appendStatus("Submitting the transaction to blockchain... You can track progress " + makeHref("here", txURL));
        
        await tx.wait();
        appendStatus("Approvement succeed!");
        appendStatus("");
    } catch (err) {
        console.log(err);
        document.getElementById("errors").innerText = "Failed to approve! See console log for details.\n" + err.message
            + "\n\nYou'll still have to approve it in the main page of the auction.";
    }

    removeDinoGames("game");

    let frondEndURL = `${getRootURL()}?addr=${auctionContract.address}`;
    appendStatus("You can now access your auction contract " + makeHref("here", frondEndURL) + "!");
}