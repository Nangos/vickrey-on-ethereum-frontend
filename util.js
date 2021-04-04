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