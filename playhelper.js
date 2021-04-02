function onLoad() {
    if (typeof window.ethereum === 'undefined') {
        window.alert("Cannot detect MetaMask. Note that you need MetaMask to take part in the auction!");
        document.getElementById("info").innerHTML = "You can download MetaMask at "
            + makeHref("https://metamask.io/", "https://metamask.io/")
            + ". Then, create a wallet to start and join us!";
    }
}

function downloadTxtFile(filename, text) {
    let element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';

    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function onGeneratorButtonClicked() {
    // Check query sanity:
    let info = getJsonFromUrl();
    if (!info.addr || !isLegalAddress(info.addr)) {
        window.alert("Please provide a valid contract address.");
        location.href = "navigator.html";
        return;
    }
    while (!info.whoami || !isLegalAddress(info.whoami)) {
        let empty = "0x";
        info.whoami = window.prompt("What is the address of your account? (Optional)", empty);
        if (!info.whoami || info.whoami == empty) {
            info.whoami = null; // well let's skip it
            break;
        }
    }

    // Ask some more questions:
    window.alert("NOTE: This webpage will not record or leak anything you typed; it just helps you prepare for the auction.");

    bidInWei = null;
    while (!bidInWei) {
        response = window.prompt(
            "How much (in wei) would you bid for the NFT?\n\n" +
            "NOTE: your bid must be NO SMALLER THAN the minimal price to be considered valid. You might want to double check now.",
            ""
        );
        bidInWei = parseBigNumber(response);
    }
    
    deposit = null;
    while (!deposit || deposit.lt(bidInWei)) {
        response = window.prompt(
            "How much (in wei) would you deposit into the auction contract?\n\n" +
            "NOTE1: your deposit must be NO SMALLER THAN your bid (" + bidInWei.toString() + " wei).\n\n" +
            "NOTE2: your bid is a secret, but YOUR DEPOSIT IS PUBLIC. I recommend you use a different value from your bid.",
            ""
        );
        deposit = parseBigNumber(response);
    }

    nonce = null;
    while (!nonce) {
        response = window.prompt(
            "What is the nonce (in plain words, a one-time-use PASSWORD) you want to use to encrypt your bid?\n\n" +
            "NOTE: I have generated one randomly for you. You can use your own hexstring instead, though.",
            generateRandomNonce()
        )
        nonce = parseBigNumber(response);
    }

    // pad your self-generated nonce to 32 bytes:
    encoder = ethers.utils.defaultAbiCoder;
    nonce = encoder.encode(["uint"], [nonce]);

    let confirmation = 
    "Address of the auction contract: " + info.addr + "\n" +
    "Address of your account: " + (info.whoami != null ? info.whoami : "(to be determined)") + "\n" +
    "Your bid: " + asWeiAndEther(bidInWei) + " (KEEP SECRET!!)\n" +
    "Your nonce: " + nonce + " (KEEP SECRET!!)\n" +
    "Your deposit: " + asWeiAndEther(deposit);

    let confirmed = window.confirm("Just to confirm the information:\n\n" + confirmation);
    if (!confirmed) {
        document.getElementById("info").innerText = "You cancelled. Please click the button to start over.";
        return;
    }

    // Calculate some internals:
    hash = ethers.utils.keccak256(encoder.encode(["uint"], [bidInWei]) + nonce.substr(2));

    // Generating the downloadable txt:
    frondEndURL = `${location.origin}${location.pathname}?addr=${info.addr}&whoami=${(info.whoami != null ? info.whoami : "fill-in-your-address-here")}`;
    contractWriteURL = `https://ropsten.etherscan.io/address/${info.addr}#writeContract`;
    contractReadURL = `https://ropsten.etherscan.io/address/${info.addr}#readContract`;


    instruction = "Thanks for taking part in the auction!\n" +
    "Your confirmed information:\n" + confirmation + "\n\n" +
    "Your encrypted bid is: " + hash + "\n\n" +
    "Be sure to check the URL below for latest information:\n" + frondEndURL + "\n\n" +

    "STAGE I -- Bid (Do it before the bidding deadline!)\n" +
    " * Go to " + contractWriteURL + "\n" +
    " * Make sure you are connected to MetaMask properly, and hit the button 'Connect to Web3'\n" +
    " * Click 'bid', and input the following as instructed:\n" +
    "   - For 'bid (payableAmount (ether))', input " + asEtherString(deposit) + "\n" +
    "   - For 'hash (bytes32)', input " + hash + "\n" +
    "   - Click 'Write', and then confirm it in the MetaMask pop-up window\n\n" +

    "STAGE II -- Reveal (Do it after the bidding deadline and before the revealing deadline!)\n" +
    " * Go to " + contractWriteURL + "\n" +
    " * Make sure you are connected to MetaMask properly, and hit the button 'Connect to Web3'\n" +
    " * Click 'reveal', and input the following as instructed:\n" +
    "   - For 'amount (uint256)', input " + bidInWei + "\n" +
    "   - For 'nonce (uint256)', input " + nonce + "\n" +
    "   - Click 'Write', and then confirm it in the MetaMask pop-up window\n\n" +

    "After The Auction Ends:\n" +
    " * Go to " + contractWriteURL + "\n" +
    " * Make sure you are connected to MetaMask properly, and hit the button 'Connect to Web3'\n" +
    " * To withdraw your deposit, click 'withdraw' followed by 'Write'. Confirm it in the MetaMask pop-up window.\n" +
    " * If you are the winner, click 'claim' followed by 'Write'. Confirm it in the MetaMask pop-up window.\n\n\n" +

    "Please wait for a minute after submitting your transaction to let it be written onto the blockchain.\n" + 
    "There are multiple ways to check if your transaction has taken effect:\n" +
    " * Via our frontend page: " + frondEndURL + "\n" +
    " * (Advanced) Via the 'Read Contract' panel on Etherscan: " + contractReadURL + "\n" +
    " * (Elite) Via RPC calls (like 'Web3') or libraries (like 'ethers')\n\n" +

    "WISH YOU GOOD LUCK!!";

    infoElement = document.getElementById("info");
    infoElement.innerHTML = "Your instruction is shown below (a copy is also downloaded to your computer):" + "<br>";
    infoElement.innerHTML += "-".repeat(80) + "\n" + "<pre>" + instruction + "</pre>";

    downloadTxtFile("auction-instructions.txt", instruction);
}