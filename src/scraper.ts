import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import { Browser } from 'puppeteer';
import excelToJson = require('convert-excel-to-json');

export default class Scraper {
    private option = {
        ignoreDefaultArgs: [
            '--disable-extensions',
            '--disable-infobars',
            '--window-position=0,0',
            '--ignore-certifcate-errors',
            '--ignore-certifcate-errors-spki-list',
            '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36"',
            '--start-maximized',
        ],
        args: [
            '--no-sandbox',
        ],
        headless: true,
    };

    async start() {
        const browser = await puppeteer.launch(this.option);

        let filePath = await this.scrapeTX(browser);
        this.createJSONFile(filePath, path.resolve(__dirname, 'public', 'tx.json'));

        filePath = await this.scrapeCA(browser);
        this.createJSONFile(filePath, path.resolve(__dirname, 'public', 'ca.json'));
        
        browser.close();
    }

    private async scrapeTX(browser: Browser): Promise<string> {
        const page   = await browser.newPage();
        const client = await page.target().createCDPSession();

        await client.send('Page.setDownloadBehavior', {
            behavior: "allow",
            downloadPath: path.resolve(__dirname, 'public')
        });
        await page.goto('https://oig.hhsc.state.tx.us/oigportal2/Exclusions');
        await page.waitForSelector('.rtbItem.rtbBtn .rtbWrap');
        await page.evaluate(() => {
            const elements: any = document.querySelectorAll('.rtbItem.rtbBtn .rtbWrap');
            elements[1].click();
        });
        await page.waitForSelector('#dnn_ctr384_DownloadExclusionsFile_lb_DLoad_ExcFile_XLS');
        await page.click('#dnn_ctr384_DownloadExclusionsFile_lb_DLoad_ExcFile_XLS');
        await page.waitForTimeout(60000);
        return path.resolve(__dirname, 'public', 'SANC2rev.xls');
    }

    private async scrapeCA(browser: Browser): Promise<string> {
        const page = await browser.newPage();
        const client = await page.target().createCDPSession();

        await client.send('Page.setDownloadBehavior', {
            behavior: "allow",
            downloadPath: path.resolve(__dirname, 'public')
        });
        await page.goto('https://files.medi-cal.ca.gov/pubsdoco/SandILanding.aspx');
        await page.waitForSelector('.contain a');
        await page.evaluate(() => {
            const elements: any = document.querySelectorAll('.contain a');
            elements[elements.length - 1].click();
        });
        await page.waitForTimeout(60000);
        return path.resolve(__dirname, 'public', 'suspall.xlsx');
    }

    private createJSONFile(input: string, output: string) {
        try {
            const json = excelToJson({
                source: fs.readFileSync(input)
            });
            fs.writeFileSync(output, JSON.stringify(json));
        } catch(e) {
            console.log('Scraper::createJSONFile():', e);
        }
    }

}