const fsp = require("fs").promises;
const fs = require("fs");
const glob = require('glob')
const process = require('process');

function getDataKeys(data) {
    const l = data.length;
    const keys = new Set();
    for (let i = 0; i < l; i++) {
        const obj = data[i];
        for (let key of Object.keys(obj)) {
            if (key == "indicator") { continue; }
            keys.add(key);
        }
    }
    return [...keys];
}

function asRow(obj, header) {
    return header.map((key) => {
        if (key in obj && obj[key]) {
            const v = obj[key].toString();
            if (v.indexOf(",") > -1) {
                v = '"' + v + '"';
            }
            return v;
        } else {
            return "";
        }
    });
}

function getDataRows(data, header) {
    return data.map((obj) => asRow(obj, header));
}

async function exportTimeseries(latestDate, indicator, subkey, indicatorData) {
    if (!indicatorData) { return; }
    const header = getDataKeys(indicatorData);
    subkey = subkey.replaceAll("/", "-");
    
    const pathname = `./data/${latestDate}`;
    
    // console.log(`[writing] ${pathname} (${indicator})`)
    await fsp.mkdir(pathname, {recursive: true});

    const filename = (indicator !== subkey) ? `${pathname}/${indicator}-${subkey}.csv` : `${pathname}/${subkey}.csv`;

    const rows = getDataRows(indicatorData, header);

    let dataStr = header.join(", ") + "\n";
    for (let i = 0; i < rows.length; i++) {
        dataStr += rows[i].join(", ");
        dataStr += "\n";
    }

    await fsp.writeFile(filename, dataStr, "utf-8");
}

function extractDate(filename) {
    filename = filename.split("/").pop()
    const lidx = filename.lastIndexOf("-");
    filename = filename.substring(0, lidx);
    return filename;
}

(async () => {
    let filename = glob.sync("./raw/*.json").map(name => ({name, ctime: fs.statSync(name).ctime})).sort((a, b) => b.ctime - a.ctime)[0].name
    if (process.argv.length > 2) {
        filename = process.argv[2];
    }
    let fileDate = extractDate(filename);

    console.log("[parsing]", filename, fileDate);
    let data = await fsp.readFile(filename);
    data = JSON.parse(data);

    delete data.descriptions;

    const latest_dates = [];
    
    for (let indicator of Object.keys(data)) {
        const indicatorData = data[indicator];
        for (let subkey of Object.keys(indicatorData)) {
            const tsData = indicatorData[subkey];
            if (!tsData || !tsData.length) { continue; }

            const latest = tsData[tsData.length - 1];
            if (!("Meldedatum" in latest)) { continue; }
            if (!latest["Meldedatum"]) { continue; }
            if (latest_dates.indexOf(latest["Meldedatum"]) > -1) { continue; }
            latest_dates.push(latest["Meldedatum"]);
        }
    }

    latest_dates.sort();
    const last_value_date = latest_dates[latest_dates.length - 1];
    if (fileDate != last_value_date) {
        console.log(`adjusting file date from ${fileDate} to ${last_value_date}`);
        fileDate = last_value_date;
    }

    // console.log("indicators", data);
    for (let indicator of Object.keys(data)) {
        const indicatorData = data[indicator];
        for (let subkey of Object.keys(indicatorData)) {
            const tsData = indicatorData[subkey];
            await exportTimeseries(fileDate, indicator, subkey, tsData);
        }
    }
})();
