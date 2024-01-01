export interface IRates{
    days:string;
    securityType:string;
    discountRate:string;
    interestRate:string;
}
export interface ITBill{
    days:string;
    securityType:string;
    discountRate:string;
    interestRate:string;
    createdAt:Date
}