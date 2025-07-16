import { Customer } from "../entities/Customer";
import { ICustomerService, IDatabaseService } from "../interfaces/services";
import { TYPES } from "../types/inversify";
import { inject, injectable } from "inversify";
import { Repository } from "typeorm";
import * as fs from 'fs';
import * as readline from 'readline';

@injectable()
export class CustomerService implements ICustomerService {
    private customerRepository: Repository<Customer>;

    constructor(
        @inject(TYPES.DatabaseService) private databaseService: IDatabaseService
    ) {
        this.customerRepository = this.databaseService.getRepository(Customer);
    }
    async processCustomersFile(filePath: string): Promise<{ processed: number; errors: number }> {
        let processed = 0;
        let errors = 0;

        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        for await (const line of rl) {
            try {
                if (this.validateLine(line)) {
                    const customerData = this.parseLine(line);

                    const existingCustomer = await this.customerRepository.findOne({
                        where: [
                            { customerId: customerData.customerId },
                            { email: customerData.email }
                        ]
                    });
                    
                    if (existingCustomer) {
                        errors++;
                        console.log(`Duplicate customer found: ${customerData.customerId} or ${customerData.email}`);
                        continue;
                    }

                    const customer = await this.customerRepository.create(customerData);
                    await this.customerRepository.save(customer);
                    processed++;
                }
            } catch (error) {
                errors++;
                console.error(`Error processing line ${line}:`, error);
            }
        }

        return { processed, errors };
    }

    validateLine (line: string): boolean {
        const parts = line.split('|');

        if (parts.length < 5) {
            return false;
        }

        const [customerId, firstName, lastName, email, age] = parts;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email)) {
            return false;
        }

        let parsedAge = null;
        if (age) {
            parsedAge = parseInt(age);
            if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 150) {
                return false;
            }
        }

        return customerId.length > 0 &&
               firstName.length > 0 &&
               lastName.length > 0;
    }

    parseLine (line: string): Partial<Customer> {
        const parts = line.split('|');
        const [customerId, firstName, lastName, email, age] = parts;

        return {
            customerId,
            firstName,
            lastName,
            email,
            age: parseInt(age)
        }
    }

    async getCustomers(): Promise<Customer[]> {
        return this.customerRepository.find();
    }

    async getCustomerByEmail(email: string): Promise<Customer | null> {
        return this.customerRepository.findOne({
            where: { email }
        });
    }
}