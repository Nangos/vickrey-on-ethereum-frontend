async function onLoad() {
    // Environment sanity checks:
    let web3Provider = await checkWeb3();
    if (web3Provider == null) {
        return;
    }
    if (ethereum.selectedAddress == null) { // require log-in
        document.getElementById("errors").innerText = "You need to log in.";
        document.getElementById("login-button").disabled = false;
    }
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
