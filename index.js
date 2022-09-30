/*
 * Headless browser automation to extract data from RKI's COVID-19-Trends dashboard
 */

const process = require("process");
const path = require("path");
const puppeteer = require('puppeteer');
const fs = require("fs").promises;
const stringify = require('json-stable-stringify');

// const DASHBOARD_URL = "https://www.rki.de/DE/Content/InfAZ/N/Neuartiges_Coronavirus/Situationsberichte/COVID-19-Trends/COVID-19-Trends.html?__blob=publicationFile#/home";
// Pandemieradar still uses the trends URI
const DASHBOARD_URL = "https://www.rki.de/DE/Content/InfAZ/N/Neuartiges_Coronavirus/Situationsberichte/COVID-19-Trends/COVID-19-Trends.html?__blob=publicationFile#/home";
const SCREENSHOT_FILENAME = "./screenshot.png";

const DEBUG_MODE = false;
let filemode = false;

const state = {
    stage: "init",
    console_intercept: false,
};

const indicators = {"descriptions": []}

async function waitFor(ms) {
    return new Promise(res => setTimeout(res, ms));
}

function resolveHandle(jsHandle) {
    return jsHandle.executionContext().evaluate((o) => o, jsHandle);
}

function descriptorKey(d) {
    let key = "";
    if (!d.indicator) {
        console.log("noindicator", d);
    }

    key = d.indicator;
    if (d.group) {
        key += "/" + d.group;
    }
    if (d.region) {
        key += "/" + d.region;
    }

    return key;
}

function pushIndicator(descriptor, obj) {
    if (obj.description) {
        indicators.descriptions.push(obj);
        return;
    }
    
    if (!(descriptor.indicator in indicators)) {
        indicators[descriptor.indicator] = {};
    }
    const target = indicators[descriptor.indicator];
    const subkey = descriptorKey(descriptor);

    if (!(subkey in target)) {
        target[subkey] = [];
    }
    target[subkey].push(obj);
}

async function interceptConsole(msg) {
    const msgText = msg.text();
    if (!msgText.startsWith("UNCOMPRESSED")) { return; }

    const msgArgs = msg.args();

    const resolved = await Promise.all(msgArgs.map(resolveHandle));
    resolved.forEach(function(arg, idx) {
        if (idx == 0) { return; }
        if (arg === null || typeof arg !== 'object') { return; }
        if (!Array.isArray(arg)) { return; }
        arg.forEach((obj) => {
            const descriptor = {
                region: obj.region, 
                indicator: obj.indicator, 
                group: obj.group,
                agegroup: obj.Altersgruppe,
            };
            if (descriptor.agegroup && !descriptor.group) {
                descriptor.group = descriptor.agegroup;
                descriptor.agegroup = null;
            }
            // clean up objects
            for (let key of ['region', 'indicator', 'group', 'agegroup']) {
                if (!descriptor[key]) {
                    delete descriptor[key];
                }
            }
            pushIndicator(descriptor, obj);
            state.console_intercept = true;
        });
    });
}

function pad(d) {
    return (""+d).padStart(2, "0");
}

function dateFilename(suffix) {
    if (!filemode) {
        const today = new Date();
        return `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}-${suffix}`
    } else {
        const filename = process.argv[2];
        const filedate = path.basename(filename).replaceAll("-data.html", "");
        return `${filedate}-${suffix}`;
    }
}
        
(async () => {
    const launchOptions = {
        headless: !DEBUG_MODE,
        defaultViewPort: {width: 1280, height: 800},
        isMobile: false,
    };
    if (DEBUG_MODE) {
        launchOptions['devtools'] = true;
    }
    state.stage = "launching";
    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    page.on('console', interceptConsole);

    state.stage = "loading"

    let target_uri = DASHBOARD_URL;

    if (process.argv.length > 2) {
        target_uri = path.resolve(process.argv[2]);
        target_uri = "file://" + target_uri;
        filemode = true;
    }

    console.log(target_uri);

    if (filemode) {
        // check if data has to be modified
        const filecontent = await fs.readFile(path.resolve(process.argv[2]), "utf-8");
        const brotliQuery = "uncompressBrotli\\(.\\){";
        const queryMatches = [...filecontent.matchAll(brotliQuery)];
        if (queryMatches.length === 0) {
            console.log("[filemode] target not found");
            process.exit(1);
        }
        if (queryMatches.length > 1) {
            console.log("[filemode] target not unique");
            process.exit(1);
        }
        const match = queryMatches[0];
        let parens = 1;
        let func_start = filecontent.indexOf("{", match.index);
        let func_end = func_start + 1;

        while ((func_end < filecontent.length - 1) && (parens > 0)) {
            const curchar = filecontent.charAt(func_end);
            if (curchar === "{") {
                parens++;
            }
            if (curchar === "}") {
                parens--;
            }
            func_end++;
        }
        if (func_start === -1 || func_end === -1 || func_end < func_start) {
            console.log("[filemode] could not identify target");
            process.exit(1);
        }
        const prefix = filecontent.substring(0, func_start);
        const suffix = filecontent.substring(func_end);

        const replacement = "{const e=new Uint8Array(t),n=BrotliDecode(e),i=(new TextDecoder).decode(n);const r = JSON.parse(i); console.log(\"UNCOMPRESSED\", r); return r;}";
        const newcontent = prefix + replacement + suffix;

        await fs.writeFile("/tmp/rkitrends.html", newcontent, "utf-8");
        console.log("[filemode] written modified");
        target_uri = "file:///tmp/rkitrends.html"
    }

    await page.goto(target_uri, { waitUntil: 'networkidle2' });

    state.stage = "navigating"
    await page.evaluate(() => {
        document.querySelector("mat-form-field.mat-form-field-type-mat-select").querySelector("div.mat-select-trigger").click()
    });
    await waitFor(2000);
    state.stage = "active";
    await page.evaluate(() => {
        document.querySelector("#mat-option-3").click()
    });
    await waitFor(3000);

    await page.screenshot({ path: SCREENSHOT_FILENAME, fullPage: true });
    const content = await page.content();

    if (!DEBUG_MODE) {
        await browser.close();
    }

    const data = stringify(indicators, {space: 2});
    const newfile = "./raw/" + dateFilename("data.json");
    await fs.writeFile(newfile, data, "utf-8");

    const newfileHtml = "./rawhtml/" + dateFilename("data.html");
    await fs.writeFile(newfileHtml, content, "utf-8");

    console.log("[update] complete", newfile)
})();
