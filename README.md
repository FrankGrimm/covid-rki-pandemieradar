# covid-rki-pandemieradar

## fork

This repo is a fork of a [previous effort](https://github.com/FrankGrimm/covid-rki-trends.git) to parse the RKI trends report before they made hospitalization data available in the [official repository](https://github.com/robert-koch-institut/COVID-19-Hospitalisierungen_in_Deutschland). It is now adapted to parse the new [Pandemieradar](https://www.rki.de/DE/Content/InfAZ/N/Neuartiges_Coronavirus/Situationsberichte/COVID-19-Trends/COVID-19-Trends.html?__blob=publicationFile#/home) report until this data is made available as well.

## description

Script to extract data from the [Pandemieradar](https://www.rki.de/DE/Content/InfAZ/N/Neuartiges_Coronavirus/Situationsberichte/COVID-19-Trends/COVID-19-Trends.html?__blob=publicationFile#/home).

Note that this repository does not contain DIVI indicators available in the dashboard due to their odd licensing.

screenshot: 
![screenshot](https://github.com/FrankGrimm/covid-rki-pandemieradar/blob/main/screenshot.png?raw=true)

## running the project

The project requires a working installation of a recent node.js, afterwards you can clone this repository and run:

```bash
npm install # install dependencies (note that this includes a headless browser and is quite large)
./run.sh # invokes all scripts as well as bugfixes for extractions in newer versions of the report
```
