function showTime() {
    let date = new Date();
    let unixTime = Math.floor(date.getTime() / 1000); // in seconds
    let readableTime = date.toLocaleString();

    document.getElementById("timer").innerText = `\nTime: ${readableTime}\nEthereum Timestamp: ${unixTime}\n`
    setTimeout(showTime, 500); // call it again per 500ms
}

function getJsonFromUrl(url) {
    if (!url) {
        url = location.search;
    }
    let query = url.substr(1);
    let result = {};
    query.split("&").forEach(function(part) {
        let item = part.split("=");
        result[item[0]] = decodeURIComponent(item[1]);
    });
    return result;
}

function isLegalAddress(addr) {
    let re = /^0x[0-9A-Fa-f]{40}$/;
    return addr.match(re) != null;
}

function isZeroHex(hex) {
    let re = /^0x0+$/;
    return hex.match(re) != null;
}

function isEqual(addr1, addr2) {
    return addr1 != null && addr2 != null && addr1.toLowerCase() == addr2.toLowerCase();
}

function makeHref(text, url) {
    return `<a target="_blank" href=${url}>${text}</a>`;
}

function getRootURL() {
    let url = location.origin + location.pathname;
    url = url.substr(0, url.lastIndexOf("/"));
    return url;
}

// Ethereum-specific utils:
function parseBigNumber(str) {
    max = ethers.BigNumber.from(256).pow(32).sub(1);
    try {
        result = ethers.BigNumber.from(str);
        if (result.gt(max)) {
            throw "value too big";
        }
        if (result.lt(0)) {
            throw "value cannot be negative";
        }
        return result;
    } catch(err) {
        console.log(err);
        return null;
    }
}

function generateRandomNonce() {
    str = "0x";
    for (i = 0; i < 32; i++) {
        byte = Math.floor(Math.random() * 256).toString(16);
        byte += "0".repeat(2 - byte.length);
        str += byte;
    }
    return str;
}

function asDecimalString(bigNum, digits) {
    divider = ethers.BigNumber.from(10).pow(digits);
    integer = bigNum.div(divider).toString();
    fraction = bigNum.mod(divider).toString();
    
    if (fraction == "0") {
        return integer;
    }
    fraction = "0".repeat(digits - fraction.length) + fraction; // add front zeros
    fraction = fraction.replace(/0*$/, ""); // remove tail zeros
    return integer + "." + fraction;
}

function asEtherString(wei) {
    return asDecimalString(wei, 18);
}

function asWeiAndEther(wei) {
    return `${wei} wei (= ${asEtherString(wei)} Ether)`;
}

function asTimeIntervalString(rawSeconds) {
    let rest = rawSeconds;
    let seconds = rest % 60; rest = Math.floor(rest / 60);
    let minutes = rest % 60; rest = Math.floor(rest / 60);
    let hours = rest % 24; rest = Math.floor(rest / 24);
    let days = rest;
    return (days > 0 ? `${days} day(s) ` : "")
        + (hours > 0 ? `${hours} hour(s) ` : "")
        + (minutes > 0 ? `${minutes} minute(s) ` : "")
        + (seconds> 0 ? `${seconds} second(s) ` : "");
}

// Downloading & Uploading:
function downloadJSONFile(filename, object) {
    let text = JSON.stringify(object);
    let element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';

    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

async function uploadFileAsJSON() {
    return new Promise((resolve, reject) => {
        let element = document.createElement('input');
        element.setAttribute('type', 'file');
        
        element.style.display = 'none';
    
        document.body.appendChild(element);
        element.click();
        element.onchange = (e) => {
            try {
                let file = e.target.files[0];
                let reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        let text = e.target.result;
                        obj = JSON.parse(text);
                        resolve(obj);
                    } catch (err) {
                        console.log(err);
                        reject(err);
                    }
                };
                reader.readAsText(file);
            } catch (err) {
                console.log(err);
                reject(err);
            }
        };
        document.body.removeChild(element);
    });
}

// Sanity checks:
async function checkWeb3() {
    if (typeof window.ethereum === 'undefined') {
        msg = "Cannot access Ethereum. Please make sure MetaMask is running.\n"
            + "When done, refresh the page.";
        window.alert(msg);
        return null;
    }

    let web3Provider = new ethers.providers.Web3Provider(window.ethereum);
    let network = await web3Provider.detectNetwork();
    if (network.name != "ropsten") {
        msg = "Please switch to Ropsten network via MetaMask.\n"
            + "When done, refresh the page.";
        window.alert(msg);
        return null;
    }

    return web3Provider;
}

async function getContractAPI(address, abiURL, isReadonly) {
    let web3Provider = await checkWeb3();
    if (web3Provider == null) {
        throw Error("Invalid web3 provider.");
    }

    let abi = await (await fetch(abiURL)).json();
    if (isReadonly) {
        return new ethers.Contract(address, abi, web3Provider);
    } else {
        return new ethers.Contract(address, abi, web3Provider.getSigner());
    }
}

async function getContractFactory(abiURL, bytecodeURL) {
    let web3Provider = await checkWeb3();
    if (web3Provider == null) {
        throw Error("Invalid web3 provider.");
    }

    let abi = await (await fetch(abiURL)).json();
    let bytecode = await (await fetch(bytecodeURL)).text();
    return new ethers.ContractFactory(abi, bytecode, web3Provider.getSigner());
}

function addDinoGame(className) {
    return; // Temporarily disabled...
    let element = document.createElement('iframe');
    element.setAttribute('class', className);
    element.setAttribute('src', "https://tuckercraig.com/dino/");
    element.setAttribute('width', 800);
    element.setAttribute('height', 300);
    element.setAttribute('scrolling', 'no');
    document.body.appendChild(element);
}

function removeDinoGames(className) {
    return; // Temporarily disabled...
    Array.from(document.getElementsByClassName(className)).forEach(element => {
        console.log(element.tagName);
        if (element.tagName == "IFRAME") {
            document.body.removeChild(element);
        }
    })
}

// For demo use:
function getNickName(address) {
    let names = {
        "0x8c34ad4a9336788814444ca3808854a5e61e00fa": "Seller",
        "0xce08fffd2891d135a955ebd5d38e5a5ed179d921": "Alice",
        "0x270ecb84d4640bd22ee4558f299fb298119be3b4": "Bob",
        "0x20ccb96b45d1c147d49755b81dbb2c0c93432fa7": "Trudy",
    }
    if (names[address] != undefined) {
        return names[address];
    } else {
        return null;
    }
}

async function getBlockSpeedArray(numRecent) {
    try {
        // fetch time intervals:
        let web3Provider = await checkWeb3();
        let latestBlock = await web3Provider.getBlockNumber();
        let blockNumbers = Array.from({length: numRecent + 1}, (x, i) => latestBlock - i);
        let blockTimestamps = await Promise.all(blockNumbers.map(async num => (await web3Provider.getBlock(num)).timestamp));
        let intervals = Array.from({length: numRecent}, (x, i) => blockTimestamps[i] - blockTimestamps[i+1]);
        return intervals;
    } catch (err) {
        console.log(err);
        return null;
    }
}

function getTypicalRespondRange(array, low, high) {
    let len = array.length;
    array.sort((a, b) => a - b);
    return {
        low: array[Math.floor(low * len)],
        high: array[Math.floor(high * len)]
    }
}

async function waitingTimeAsString() {
    try {
        let range = getTypicalRespondRange(await getBlockSpeedArray(20), 0.2, 0.9);
        let offset = 1; // 1s for confirmation or anything
        return `Estimated processing time: ${asTimeIntervalString(range.low + offset)} to ${asTimeIntervalString(range.high + offset)}`;
    } catch (err) {
        console.log(err);
        return `Estimated processing time: (Unavailable)`;
    }
}