import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import { Browser } from 'puppeteer';
import fsExtra = require('fs-extra');
import excelToJson = require('convert-excel-to-json');
import Service from './v1/service';

export default class Scraper {
    private v1 = new Service();
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
        this.removeFiles();

        const browser = await puppeteer.launch(this.option);

        let filePath = await this.scrapeTX(browser);
        this.createJSONFile(filePath, path.resolve(__dirname, 'public', 'tx.json'));
        this.v1.createTxJson(filePath);

        filePath = await this.scrapeCA(browser);
        this.createJSONFile(filePath, path.resolve(__dirname, 'public', 'ca.json'));
        this.v1.createCaJson(filePath);

        filePath = await this.scrapeFederal(browser);
        this.v1.createFederalJson(filePath);

        filePath = await this.scrapeSAM(browser);
        await this.v1.createSamJson(filePath);

        browser.close();
    }

    private async scrapeTX(browser: Browser): Promise<string> {
        const page   = await browser.newPage();
        const client = await page.target().createCDPSession();

        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: path.resolve(__dirname, 'public')
        });
        await page.goto('https://oig.hhsc.state.tx.us/oigportal2/Exclusions/ctl/DOW/mid/384');
        await page.waitForSelector('#dnn_ctr384_DownloadExclusionsFile_lb_DLoad_ExcFile_XLS');
        
        const file = path.resolve(__dirname, 'public/SANC2rev.xls');
        while(!fs.existsSync(file)) {
            await page.evaluate(() => {
                const element: any = document.getElementById('dnn_ctr384_DownloadExclusionsFile_lb_DLoad_ExcFile_XLS');
                element.click();
            });
            await page.waitForTimeout(5000);
        }
        await page.waitForTimeout(60000);
        return file;
    }

    private async scrapeCA(browser: Browser): Promise<string> {
        const page = await browser.newPage();
        const client = await page.target().createCDPSession();

        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: path.resolve(__dirname, 'public')
        });
        await page.goto('https://files.medi-cal.ca.gov/pubsdoco/SandILanding.aspx');
        await page.waitForSelector('.contain a');
        await page.evaluate(() => {
            const elements: any = document.querySelectorAll('.contain a');
            elements[elements.length - 1].click();
        });
        await page.waitForTimeout(60000);
        return path.resolve(__dirname, 'public/suspall.xlsx');
    }

    private async scrapeFederal(browser: Browser): Promise<string> {
        const page = await browser.newPage();
        const client = await page.target().createCDPSession();

        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: path.resolve(__dirname, 'public')
        });
        await page.goto('https://oig.hhs.gov/exclusions/exclusions_list.asp');
        await page.evaluate(() => {
            window.open('https://oig.hhs.gov/exclusions/downloadables/UPDATED.csv');
        });
        await page.waitForTimeout(60000);
        return path.resolve(__dirname, 'public/UPDATED.csv');
    }

    private async scrapeSAM(browser: Browser): Promise<string> {
        const page = await browser.newPage();
        const client = await page.target().createCDPSession();

        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: path.resolve(__dirname, 'public')
        });
        await page.goto('https://sam.gov/data-services/Exclusions/Public%20V2?privacy=Public');
        await page.waitForSelector('.sds-dialog-actions .usa-button');
        await page.click('.sds-dialog-actions .usa-button');
        await page.waitForSelector('.usa-width-one-whole .data-service-entry');

        const fileName = await page.evaluate(async () => {
            const link: any = document.querySelector('.usa-width-one-whole .data-service-entry .data-service-file-link');
            link.removeChild(link.querySelector('i'));
            link.removeChild(link.querySelector('span'));

            const fileName = link.textContent.trim().split('.')[0] + '.zip';
            link.click();

            await new Promise(resolve => setTimeout(resolve, 2000));
            document.querySelectorAll('.input-toggle.ng-pristine').forEach((check: any) => {
                check.click();
            });

            const btn:any = document.querySelector('.usa-modal-content-submit-btn button');
            btn.click();

            return fileName;
        });

        await page.waitForTimeout(60000);
        return path.resolve(__dirname, `public/${fileName}`);
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

    private removeFiles() {
        const dir = path.resolve(__dirname, 'public');
        fsExtra.emptyDirSync(dir);
    }

}