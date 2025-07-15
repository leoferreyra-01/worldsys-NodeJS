import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";


@Entity('customers')
export class Customer {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 255 })
    customerId!: string;

    @Column({ type: 'varchar', length: 255 })
    firstName!: string;

    @Column({ type: 'varchar', length: 255 })
    lastName!: string;

    @Column({ type: 'varchar', length: 255 })
    email!: string;

    @Column({ type: 'int' })
    age!: number;

    @CreateDateColumn()
    createdAt!: Date;
}