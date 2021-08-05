import * as fs from 'fs';
import * as path from 'path';
import * as xlsx from 'xlsx';
import * as extract from 'extract-zip';

export default class Service {

    createTxJson(input: string) {
        const wb = xlsx.readFile(
            input, 
            {
                cellDates: true,
            }
        );
        const rows: any[] = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const data = [];
        
        for(const row of rows) {
            data.push({
                FirstName: row.FirstName,
                LastName: row.LastName,
                MiddleName: row.MidInitial,
                LicenseNumber: row.LicenseNumber,
                ProviderNumber: row.NPI,
                Date: row.StartDate,
            });
        }

        const dir = path.resolve(__dirname, '../public/v1');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        
        this.createJson(data, path.resolve(dir, 'tx.json'));
    }

    createCaJson(input: string) {
        const wb = xlsx.readFile(
            input, 
            {
                cellDates: true,
            }
        );
        const rows: any[] = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const data = [];
        
        for(const row of rows) {
            data.push({
                FirstName: row['First Name'],
                LastName: row['Last Name'],
                MiddleName: row['Middle Name'],
                LicenseNumber: row['License Number'],
                ProviderNumber: row['Provider Number'],
                Date: row['Date of Suspension'],
            });
        }

        const dir = path.resolve(__dirname, '../public/v1');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        
        this.createJson(data, path.resolve(dir, 'ca.json'));
    }

    createFederalJson(input: string) {
        const wb = xlsx.readFile(
            input, 
            {
                cellDates: true,
            }
        );
        const rows: any[] = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const data = [];
        
        for(const row of rows) {
            const date = String(row['EXCLDATE']);
            const year = Number(date.substring(0, 4));
            const month = Number(date.substring(4, 6));
            const day = Number(date.substring(6, 8));

            data.push({
                FirstName: row['FIRSTNAME'],
                LastName: row['LASTNAME'],
                MiddleName: row['MIDNAME'],
                ProviderNumber: row['NPI'],
                Date: new Date(year, month-1, day).toISOString(),
            });
        }

        const dir = path.resolve(__dirname, '../public/v1');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        
        this.createJson(data, path.resolve(dir, 'federal.json'));
    }

    async createSamJson(input: string) {
        await extract(input, {dir: path.dirname(input)});
        const fileName = input.split('.')[0] + '.CSV';
        const wb = xlsx.readFile(
            fileName, 
            {
                cellDates: true,
            }
        );
        const rows: any[] = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const data = [];
        
        for(const row of rows) {
            data.push({
                FirstName: row['First'] || '',
                LastName: row['Last'] || '',
                MiddleName: row['Middle'] || '',
                ProviderNumber: row['NPI'] || '',
                Date: row['Creation_Date']
                    ? new Date(row['Creation_Date']).toISOString()
                    : '',
            });
        }

        const dir = path.resolve(__dirname, '../public/v1');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        
        this.createJson(data, path.resolve(dir, 'sam.json'));
    }

    private async createJson(data: any, file: string) {
        data = JSON.stringify(data);
        
        return new Promise((resolve, reject) => {
            fs.writeFile(file, data, 'utf8', (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(true);
                }
            })
        });
    }

}