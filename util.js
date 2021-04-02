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