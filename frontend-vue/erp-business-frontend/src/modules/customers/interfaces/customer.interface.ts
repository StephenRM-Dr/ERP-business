import type { Currency } from '@/modules/currencies/interfaces/currency.interface';

/**
 * Base interface for a customer.
 * This is the representation of a customer in the frontend application.
 */
export interface Customer {
    id: string;
    documentType: string;
    documentNumber: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    creditLimit: number;
    paymentTermsDays: number;
    notes: string;
    isSpecialTaxpayer: boolean; // SENIAT-designated special taxpayer: withholds a % of IVA on invoices issued to them.
    createdAt: string;
    updatedAt: string;
    creditAvailable?: number; // Optional: only present in some responses
    defaultCurrency?: Currency | null; // Optional: may be null
}

/**
 * Model for tax information associated with a customer.
 */
export interface CustomerTax {
    id: string;
    isTaxExempt: boolean;
    taxId?: string | null;
    exemptionReason?: string | null;
    certificateNumber?: string | null;
    certificateExpiryDate?: string | null;
    notes?: string | null;
}

/**
 * Complete Customer model with nested tax and currency information.
 */
export interface CustomerResponse extends Customer {
    tax: CustomerTax;
    defaultCurrency: Currency | null;
}

/**
 * Fields collected by the create/edit form. Server-generated fields
 * (id, timestamps, credit availability) are excluded.
 */
export type CustomerFormData = Omit<
    Customer,
    'id' | 'createdAt' | 'updatedAt' | 'creditAvailable' | 'defaultCurrency'
>;

/**
 * Interface for a customer payment method (bank account or credit card).
 */
export interface CustomerPaymentMethod {
    id: string;
    description: string;
    accountNumber: string;
    accountHolder: string;
    bankName: string;
    type: 'BANK_ACCOUNT' | 'CREDIT_CARD' | 'PAYPAL' | 'ZELLE' | 'CASH';
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

/**
 * Interface for customer address information.
 */
export interface CustomerAddress {
    id: string;
    street1: string;
    street2: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
}